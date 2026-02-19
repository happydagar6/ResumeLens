// src/agents/screeningGraph.js
// LangGraph StateGraph that orchestrates the full resume screening pipeline.
//
// FLOW:
//   START
//     → loadDocuments     (fetch Resume + Job from DB)
//     → ensureEntities    (extract resume entities, skip if already done)
//     → ensureAnalyzedJD  (analyze job description, skip if already done)
//     → scoreResume       (score resume against job — always runs)
//     → saveResults       (persist Screening doc + update resume status)
//   END
//
// DESIGN PRINCIPLES:
//   - Idempotent: each node checks if work is already done before calling AI
//   - Fault-isolated: each node catches its own errors and writes to state.error
//   - Conditional routing: if any node sets a fatal error, pipeline skips to END

const { StateGraph, Annotation, END, START } = require("@langchain/langgraph");
const mongoose = require("mongoose");
const Resume = require("../models/resumeModel");
const Job = require("../models/jobModel");
const Screening = require("../models/screeningModel");
const { extractEntities } = require("../services/entityExtractorAgent");
const { analyzeJD } = require("../services/jdAnalyzerAgent");
const { scoreResume } = require("../services/resumeScorerAgent");

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATE SCHEMA
// Annotation.Root() defines the shape of the state object that gets passed
// between every node. Each field has a "reducer" — a function that merges
// the old value with a new update value.
// ─────────────────────────────────────────────────────────────────────────────

const GraphState = Annotation.Root({
  // ---Inputs ----------------------
  resumeId: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // Loaded DB documents
  resume: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),
  job: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // ── Computed data that flows through the pipeline ─────────────────────────
  extractedEntities: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),
  analyzedJD: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),
  scoringResult: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  // ---Output ------------------------
  screeningId: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),
  // ── Error & status tracking ───────────────────────────────────────────────
  // errors: accumulates across all nodes (never overwritten, only appended)

  errors: Annotation({
    reducer: (current, update) => {
        if (!update || update.length === 0) return current;
        return [...(current || []), ...(Array.isArray(update) ? update : [update])]; 
    },
    default: () => [],
  }),

  // fatalError: set to a message string to abort the pipeline early.
  fatalError: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),
  status: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => "pending",
  })
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. NODE FUNCTIONS
// Each node receives the full current state and returns a PARTIAL state update.
// Only the fields you return get merged — everything else stays the same.
// ─────────────────────────────────────────────────────────────────────────────

// Node 1: loadDocuments
// Fetches Resume and Job from MongoDB. If either is missing, sets fatalError
// which will cause the conditional router to skip all subsequent nodes.

async function loadDocuments(state) {
    try {
        // Normalize: LangGraph v1.x can pass the full input object as the channel value.
        // Handle both plain string and { resumeId: '...' } object forms.
        const resumeId = typeof state.resumeId === "string"
            ? state.resumeId
            : (state.resumeId?.resumeId ?? null);

        if (!resumeId) {
            return { fatalError: "resumeId is required", status: "error" };
        }

        // Validate ObjectId format before querying
        if (!mongoose.Types.ObjectId.isValid(resumeId)) {
            return { fatalError: `Invalid resumeId format: ${resumeId}`, status: "error" };
        }

        const resume = await Resume.findById(resumeId);
        if(!resume) {
            return { fatalError: `Resume not found for ID: ${resumeId}`, status: "error" };
        }

        const job = await Job.findById(resume.jobId);
        if(!job) {
            return { fatalError: `Job not found for ID: ${resume.jobId}`, status: "error" };
        }

        if(!resume.parsedText) {
            return { fatalError: `Resume ${resumeId} is missing parsedText`, status: "error" };
        }

        console.log(`[Graph] Loaded documents - Resume: ${resume.candidateName}, Job: ${job.title}`);

        return {
            resume,
            job,
            // Pre loaded cached data directly from DB documents
            extractedEntities: resume.extractedEntities || null,
            analyzedJD: job.analyzedJD || null,
            status: "loaded",
        };
    } catch (error) {
        return { fatalError: `loadedDocuments failed: ${error.message}`, status: "error" };
    }
}

// Node 2: ensureEntities
// If resume.extractedEntities already exists (from the upload flow in resumeController),
// this node is a no-op. Otherwise, it runs entity extraction via the LangChain agent.

async function ensureEntities(state) {
    // Cache hit: skip AI call--------------------------------
    if (state.extractedEntities && Object.keys(state.extractedEntities).length > 0) {
        console.log("[Graph] Entity extraction - using cached data, skipping AI call");
        return {}; // No state update needed
    }

    // Cache miss: run extraction --------------------------------
    try {
        console.log("[Graph] Entity extraction - running AI.....");
        const entities = await extractEntities(state.resume.parsedText);

        // Persist to DB so next pipeline run can use cache
        await Resume.findByIdAndUpdate(state.resume._id, { extractedEntities: entities });
        console.log("[Graph] Entity extraction - AI call complete, results cached to DB");

        return { extractedEntities: entities };
    } catch (error) {
        // Non-fatal: scoring can still work without entities (just less accurate)
        console.error("[Graph] Entity extraction failed:", error);
        return {
            extractedEntities: {},
            errors: [`Entity extraction failed: ${error.message}`],
        };
    }
}

// Node 3: ensureAnalyzedJD
// If job.analyzedJD already exists (from the job creation flow in jobsController),
// this node is a no-op. Otherwise, it runs JD analysis via the LangChain agent.
async function ensureAnalyzedJD(state) {
    // ── Cache hit: skip AI call ───────────────────────────────────────────────
    if (state.analyzedJD && Object.keys(state.analyzedJD).length > 0) {
        console.log("[Graph] JD analysis — using cached data, skipping AI call");
        return {}; // No state update needed
    }

    // ── Cache miss: run analysis ──────────────────────────────────────────────
    try {
        console.log("[Graph] JD analysis — running AI...");
        const analyzed = await analyzeJD(state.job.description);

        // Persist to DB so next pipeline run (and other resumes for same job) can use cache
        await Job.findByIdAndUpdate(state.job._id, { analyzedJD: analyzed });
        console.log("[Graph] JD analysis — complete:", analyzed.requiredSkills?.length, "required skills found");

        return { analyzedJD: analyzed };
    } catch (err) {
        // Non-fatal: scoring can still work with raw job description
        console.error("[Graph] JD analysis failed (non-fatal):", err.message);
        return {
            analyzedJD: null,
            errors: [`JD analysis failed: ${err.message}`],
        };
    }
}

// Node 4: scoreResumeNode
// The core of the pipeline. Always runs. Uses all available context:
// resume text + extracted entities + raw JD + structured JD analysis.
async function scoreResumeNode(state) {
    try {
        console.log("[Graph] Scoring resume — running AI...");

        const result = await scoreResume(
            state.resume.parsedText,
            state.job.description,
            state.extractedEntities || {},
            state.analyzedJD || null
        );
        console.log(`[Graph] Resume scoring — complete. Score: ${result.score}, Recommendation: ${result.recommendation}`);
        return { scoringResult: result, status: "scored" };
    } catch (err) {
        // Fatal: without a score, there is nothing to save
        return {
            fatalError: `Resume scoring failed: ${err.message}`,
            status: "error",
        };
    }
}

// Node 5: saveResults
// Persists the Screening document and updates the resume status.
// This is the only node that writes to the Screening collection.
// If a Screening already exists for this resume+job, it updates it (upsert).
async function saveResults(state) {
    try {
        const r = state.scoringResult;

        // Upsert: if re-running the pipeline for the same resume, update existing record
        const screening = await Screening.findOneAndUpdate(
            { resumeId: state.resume._id, jobId: state.job._id },
            { 
                resumeId: state.resume._id, 
                jobId: state.job._id, 
                overallScore: r.score,
                matchedSkills: r.matchedSkills,
                missingSkills: r.missingSkills,
                strengths: r.strengths,
                weaknesses: r.weaknesses,
                recommendation: r.recommendation,
                rawAIResponse: r,
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Update resume to "screened" status and clear any old errors
        await Resume.findByIdAndUpdate(state.resume._id, {
            status: "screened",
            screeningError: null,
        });
        console.log(`[Graph] Results saved - Screening ID: ${screening._id}`);

        return {
            screeningId: screening._id.toString(), // convert to string for frontend use
            status: "completed",
        };
    } catch (error) {
        return {
            fatalError: `saveResults failed: ${error.message}`,
            status: "error",
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONDITIONAL ROUTER
// After certain nodes, we check for a fatalError. If one exists,
// we route directly to END instead of continuing the pipeline.
// ─────────────────────────────────────────────────────────────────────────────

function routeOrAbort(state) {
    if (state.fatalError) {
        console.error(`[Graph] Pipeline aborted: ${state.fatalError}`);
        return "abort";
    }
    return "continue";
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. BUILD & COMPILE THE GRAPH
// ─────────────────────────────────────────────────────────────────────────────

const workflow = new StateGraph(GraphState)
    // ── Register nodes ─────────────────────────────────────────────────────────
    .addNode("loadDocuments", loadDocuments)
    .addNode("ensureEntities", ensureEntities)
    .addNode("ensureAnalyzedJD", ensureAnalyzedJD)
    .addNode("scoreResume", scoreResumeNode)
    .addNode("saveResults", saveResults)

    // Entry point
    .addEdge(START, "loadDocuments")

    // After loadDocuments: abort if resume/job not found
    .addConditionalEdges("loadDocuments", routeOrAbort, {
        continue: "ensureEntities",
        abort: END,
    })

    // ── ensureEntities → ensureAnalyzedJD (always continue — non-fatal node) ──
    .addEdge("ensureEntities", "ensureAnalyzedJD")

    // ── ensureAnalyzedJD → scoreResume (always continue — non-fatal node) ────
    .addEdge("ensureAnalyzedJD", "scoreResume")

    // After scoreResume: abort if scoring itself failed
    .addConditionalEdges("scoreResume", routeOrAbort, {
        continue: "saveResults",
        abort: END,
    })

    // saveResults → END
    .addEdge("saveResults", END);


// Compile once at module load - reused for every pipline invocation
const screeningGraph = workflow.compile();

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUBLIC API
// runScreeningPipeline() is the single entry point used by the controller.
// It wraps graph.invoke() and handles the error persistence logic.
// ─────────────────────────────────────────────────────────────────────────────

async function runScreeningPipeline(resumeId) {
    // Mark resume as "screening" in DB before we start (so UI can show progress)
    await Resume.findByIdAndUpdate(resumeId, { status: "screening", screeningError: null });

    // Invoke the graph — returns the final merged state after all nodes run
    const finalState = await screeningGraph.invoke({ resumeId });

    // If the pipeline ended with a fatal error, update resume status in DB
    if (finalState.fatalError || finalState.status === "error") {
        const errMsg = finalState.fatalError || "Unknown pipeline error";
        await Resume.findByIdAndUpdate(resumeId, {
            status: "error",
            screeningError: errMsg,
        });
        return {
            success: false,
            resumeId,
            error: errMsg,
            warnings: finalState.errors || [],
        };
    }

    return {
        success: true,
        resumeId,
        screeningId: finalState.screeningId,
        score: finalState.scoringResult?.score,
        recommendation: finalState.scoringResult?.recommendation,
        warnings: finalState.errors || [], // Non-fatal warnings (e.g., entity extraction failed but scoring continued)
    };
}

module.exports = { runScreeningPipeline };