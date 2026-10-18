# Project Memory & Evolution Log — ResumeLens

**Scope:** Complete historical log of all architectural milestones, implemented features, technical decisions, and commits from day one to the present.

---

## 1. Project Inception & Initial Vision

ResumeLens was conceived to modernize recruitment workflows by bridging the gap between manual recruiter evaluations and autonomous AI agent pipelines. Traditional ATS systems (Workday, Taleo) suffer from sluggish interfaces, manual resume parsing, and lack of candidate transparency. ResumeLens set out to emulate modern, high-velocity commercial ATS platforms (Ashby, Lever, Linear-grade UX) with real-time feedback loops.

---

## 2. Chronological Milestones & Features Built

### Milestone 0: Core Foundation & MVP Setup
- **Authentication & RBAC:**
  - Implemented JWT authentication with HTTP-only cookies (`authController.js`).
  - Added user roles: `admin`, `hiring_manager`, `recruiter` with route-level protection (`protect`, `authorize`).
- **Cloud Resume Ingestion:**
  - Integrated `multer` memory storage with `pdf-parse` for in-memory buffer text extraction.
  - Connected Cloudinary API for secure PDF resume hosting.
- **Asynchronous AI Screening Infrastructure:**
  - Deployed Redis with BullMQ background queue (`backgroundQueue.js`) to decouple HTTP requests from LLM operations.
  - Implemented a 5-node LangGraph autonomous agent workflow (`screeningGraph.js`):
    - `loadDocuments` ➔ `ensureEntities` ➔ `ensureAnalyzedJD` ➔ `scoreResume` ➔ `saveResults`.
    - Produces Skills Match (0–100), Experience Match (0–100), Overall Score, Strengths, Red Flags, and Recommendation (`strong_yes`, `yes`, `maybe`, `no`).
- **Real-Time Push Layer:**
  - Built `sseService.js` using Server-Sent Events (SSE).
  - Pushes `screening_complete` notifications directly to the recruiter's browser upon background job completion.
- **AI Interview Question Generator & Candidate Chat Copilot:**
  - Generates tailored behavioral, technical, and situational questions (`questionGeneratorAgent.js`).
  - Implemented conversational drawer (`candidateChatAgent.js`) allowing recruiters to interrogate the candidate's resume via LLM.

---

### Milestone 1: Public Careers Portal & Candidate Self-Service Tracking (Phase 1)
- **Commit:** `288e1db`
- **What Was Built:**
  1. **Public Careers Apply Page (`/apply/[jobId]`):**
     - Allowed external applicants to submit details and upload their PDF resume without requiring an account.
     - Implemented immediate client-side PDF validation and error handling.
  2. **Candidate Status Tracking Portal (`/status/[resumeId]`):**
     - Created a transparent candidate tracking interface displaying a 5-step progress stepper: *Applied ➔ Screening ➔ Review ➔ Interview ➔ Decision*.
     - Protected candidate privacy by stripping internal recruiter scoring, notes, and AI rationale from public endpoints.
  3. **Duplicate Candidate Guard:**
     - Query check by email and job ID.
     - Throws `409 Conflict` if the candidate already applied to the same job.
     - Flags `isPastApplicant: true` if the candidate previously applied to a different role.

---

### Milestone 2: 1-Click Candidate Email Dispatching (Phase 2)
- **Commit:** `5e63e96`
- **What Was Built:**
  1. **AI Email Drafting Agent (`emailDraftAgent.js`):**
     - Generates contextual, professional email copy tailored to candidate name, job title, and decision (Interview Invitation, Constructive Rejection, Offer Letter).
  2. **Email Composer Dialog:**
     - Added modal on the candidate screening page allowing recruiters to preview, edit, or copy subject lines and message bodies before sending.
  3. **Transactional Delivery via Resend:**
     - Integrated Resend SDK (`emailService.js`) for reliable inbox delivery.
     - Added automatic logging to the candidate's `AuditLog` timeline with action `EMAIL_SENT`.

---

### Milestone 3: Interactive Candidate Kanban Pipeline Board (Phase 3)
- **Commit:** `a09a0dd`
- **What Was Built:**
  1. **5-Stage Drag-and-Drop Pipeline Board (`/jobs/[jobId]/screening`):**
     - Organized candidates visually into 5 distinct pipeline stages: `applied`, `screening`, `interview`, `offered`, `hired` (with `rejected` drawer).
  2. **Optimistic UI Stage Transitions:**
     - Implemented `usePipelineStatus()` mutation allowing 1-click stage advancement with instant UI updates and background database persistence.
  3. **Metrics & Stage Distribution:**
     - Displayed live candidate counters on stage column headers with recommendation badges (`strong_yes`, `yes`, etc.).

---

### Milestone 4: 1-Click Candidate CSV Export Engine (Phase 4)
- **Commit:** `3df7703`
- **What Was Built:**
  1. **RFC-4180 Compliant CSV Export:**
     - Built client-side streaming utility `exportCandidatesToCSV` in `candidate-kanban.jsx`.
     - Exports candidate name, email, phone, current stage, AI overall score, recommendation, and submission date.
  2. **Data Sanitization:**
     - Sanitized commas, line-breaks, and quotes to prevent CSV injection vulnerabilities and formatting corruption in Microsoft Excel and Google Sheets.

---

### Milestone 5: Centralized Enterprise Talent Pool Directory (Phase 5)
- **Commit:** `2716232`
- **What Was Built:**
  1. **Cross-Job Talent Directory (`/candidates`):**
     - Aggregated candidate records across all jobs into a unified talent pool for executive visibility.
  2. **5-Block Filter Panel:**
     - Search by keywords (candidate name, email, extracted skills).
     - Filter by Job requisition, Pipeline Stage, Recommendation tier, and Date freshness.
  3. **Live KPI Summary Metrics:**
     - Metric cards calculating Total Talent, Screened Candidates, High Match count, and Active Interviewees.
  4. **Talent Pool CSV Export:**
     - One-click export of filtered talent lists.

---

### Milestone 6: Internal Recruiter Notes & Team Collaboration Feed (`teamNotes`)
- **Status:** Completed & Verified
- **What Was Built:**
  1. **Step 1 — Database Schema Evolution (`screeningModel.js`):**
     - Preserved legacy `notes: String` for backward compatibility.
     - Added `teamNotes: [subdocument]` array containing:
       - `author`: ObjectId ref `User` (Required)
       - `text`: String (Required, trimmed)
       - `category`: Enum `["general", "interview", "salary", "decision"]`
       - `createdAt`: Date (`default: Date.now`)
  2. **Step 2 — Backend Controller & Routes (`screeningController.js`, `screeningRoutes.js`):**
     - Created `getScreeningNotes`, `addScreeningNote`, and `deleteScreeningNote`.
     - Enforced job-level scoping (`job.createdBy === req.user.id || job.assignedTo.includes(req.user.id)`).
     - Enforced author-only deletion security guard (`note.author.toString() === req.user.id || req.user.role === 'admin'`).
     - Added audit logging with `action: "NOTE_ADDED"`, category metadata, and note snippet preview.
     - Protected routes with `authorize("hiring_manager", "recruiter", "admin")`.
  3. **Step 3 — TanStack React Query Hooks (`use-screening.js`):**
     - Implemented `useScreeningNotes(screeningId)` with query key `["screening", "notes", screeningId]`.
     - Implemented `useAddScreeningNote()` with dual cache invalidation (instantly refreshes both notes feed and audit timeline).
     - Implemented `useDeleteScreeningNote()` with instant cache invalidation.
  4. **Step 4 — UI Feed, Embedding & Timeline Polish:**
     - Created `candidate-notes.jsx` with author initials avatar, role badge (`Recruiter`, `Hiring Manager`, `Admin`), relative timestamps, category tags, composer with category selector, and conditional delete button.
     - Embedded `<CandidateNotes />` on `/screening/[screeningId]/page.jsx` directly above the Activity Timeline.
     - Enhanced `audit-timeline.jsx` with `MessageSquare` icon, sky-blue badge, and italicized note preview quote.

---

## 3. Key Architectural Decisions & Retrospectives

| Decision | Alternative Considered | Why Chosen |
| :--- | :--- | :--- |
| **`teamNotes` as New Array vs Overwriting `notes`** | Replacing `notes: String` with array | Existing MongoDB records had `notes: ""` (empty string). Changing the schema type to an array caused Mongoose `CastError: Cast to Array failed`. Adding `teamNotes` ensured 100% backward compatibility with zero migration downtime. |
| **TanStack Query vs Zustand for Notes** | Global Zustand store | Team notes represent server state shared across multiple concurrent recruiters. TanStack Query provides automatic background revalidation, cache invalidation, and network status without manually managing synchronization. |
| **Server-Sent Events (SSE) vs WebSockets** | Bi-directional WebSockets (`socket.io`) | Screening updates are strictly one-way (server pushes event to client when AI finishes). SSE runs over standard HTTP, traverses corporate firewalls effortlessly, supports automatic browser reconnection, and requires zero extra ports or handshake overhead. |
| **`default: Date.now` vs `Date.now()`** | `default: Date.now()` | In Mongoose, calling `Date.now()` executes the function once when the Node.js server boots up, causing all subsequently created records to share the exact same boot timestamp. Passing the function reference `Date.now` executes it freshly upon document creation. |
| **Author Deletion Guard in Both Frontend & Backend** | Frontend-only button hiding | Hiding the delete button in the UI provides a clean user experience, but malicious actors can still forge API requests. Placing the check in both `candidate-notes.jsx` (`canDelete`) and `screeningController.js` (`note.author.toString() !== req.user.id`) guarantees foolproof security. |
