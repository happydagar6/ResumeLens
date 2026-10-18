# Product Requirements Document (PRD) — ResumeLens (Recruit AI)

**Version:** 2.0  
**Status:** Living Document  
**Target Standard:** Commercial B2B SaaS ATS (Ashby / Lever / Greenhouse Benchmark)

---

## 1. Executive Summary & Vision

**ResumeLens (Recruit AI)** is an enterprise-grade, multi-tenant Applicant Tracking System (ATS) powered by autonomous AI agent workflows. It eliminates recruiting bottlenecks by automating:
- Resume parsing and candidate deduplication
- 3-dimensional multi-stage candidate scoring using LangGraph and GPT-4o-mini
- Real-time pipeline updates via Server-Sent Events (SSE)
- 1-click candidate engagement emails via Resend
- Visual 5-stage drag-and-drop Kanban hiring pipelines
- Candidate self-service application and live status tracking
- Centralized talent pool discovery with 5-block filtering and CSV export
- Collaborative team recruiter notes with role-based visibility and audit trails

---

## 2. Target Users & Personas

### 2.1. Technical Recruiter & Sourcer
- **Goal:** Source, screen, and organize large volumes of candidates across open job requisitions without manual spreadsheet tracking.
- **Pain Point:** Spending 10–15 hours weekly reading PDFs, writing repetitive rejection/interview emails, and manually tracking candidates.
- **Solution:** Instant AI screening scores, 1-click candidate emails, Kanban stage transitions, and fast CSV talent export.

### 2.2. Hiring Manager
- **Goal:** Review high-potential candidates, assess technical match, and leave structured interview notes.
- **Pain Point:** Lack of standardized screening criteria, missed candidate context, and delayed interview loops.
- **Solution:** 3-dimensional AI scoring breakdown, generated interview questions, candidate AI copilot chat, and team collaboration notes.

### 2.3. Talent Operations / Platform Admin
- **Goal:** Manage team members, enforce role-based access control (RBAC), monitor hiring metrics, and oversee the global candidate talent pool.
- **Pain Point:** Fragmented recruiter activity, lack of audit trails, compliance risks, and duplicate applicant data.
- **Solution:** Centralized `/candidates` directory, activity audit timeline, and granular user/job assignment permissions.

### 2.4. Job Candidate (Applicant)
- **Goal:** Apply easily to job requisitions and stay updated on application progress without "ghosting".
- **Pain Point:** Lack of visibility once a resume is submitted; no way to check evaluation stage.
- **Solution:** Clean public careers portal (`/apply/[jobId]`) and live tracking link (`/status/[resumeId]`).

---

## 3. Product Scope & Functional Requirements

### Module 1: Job Management & Requisition Engine
- **Job Creation & Editing:** Support for Title, Department, Location (Remote/Hybrid/Onsite), Type (Full-time/Part-time/Contract), Experience Level, and Salary Range.
- **AI Job Description Generator:** Generate structured, bias-free job descriptions using OpenAI prompts based on job title, industry, and required competencies.
- **Job Status Control:** Draft, Published, Closed statuses with automatic careers page synchronization.
- **Job Team Assignment:** Assign specific Recruiters and Hiring Managers (`assignedTo`) to enforce strict job data boundaries.

### Module 2: Public Candidate Application & Self-Service Portal
- **Public Career Apply Page (`/apply/[jobId]`):**
  - Clean, unauthenticated landing page for external applicants.
  - Multi-part form: Candidate Name, Email, Phone, LinkedIn/Portfolio URLs, and PDF resume drag-and-drop.
  - Immediate client-side file validation (PDF only, maximum 10MB).
- **Candidate Status Tracker (`/status/[resumeId]`):**
  - Tokenized, secure tracking portal for candidates.
  - Visual 5-step progress stepper: *Applied ➔ AI Screening ➔ Under Review ➔ Interview Loop ➔ Final Decision*.
  - Candidate privacy shield: Internal AI scores, notes, and recruiter rationale are strictly stripped from public candidate responses.

### Module 3: Resume Ingestion, Extraction & Deduplication
- **PDF Resume Parsing:** In-memory PDF text extraction using `pdf-parse` without persisting raw files on server disk.
- **Cloud Storage:** Secure upload of original resume files to Cloudinary CDN returning secure HTTPS delivery URLs.
- **AI Entity Extraction:** Automatic extraction of candidate email, phone, location, skills, education, and years of experience.
- **Duplicate Applicant Detection:**
  - Same email applied to the **same job** ➔ Automatically rejected with `409 Conflict` (prevents spam and duplicate screening fees).
  - Same email applied to a **different job** ➔ Allowed, flagged with `isPastApplicant: true` for recruiter visibility.

### Module 4: Multi-Agent AI Screening Engine (LangGraph Pipeline)
- **Asynchronous Execution:** Heavy LLM screening tasks are delegated to BullMQ workers over Redis, keeping HTTP API response times under 100ms.
- **5-Node LangGraph Graph:**
  1. `loadDocuments`: Fetches candidate resume and job description.
  2. `ensureEntities`: Validates and extracts key candidate credentials and skills.
  3. `ensureAnalyzedJD`: Normalizes core requirements, nice-to-haves, and dealbreakers from the job description.
  4. `scoreResume`: Multi-dimensional evaluation:
     - **Skills Match Score (0–100):** Overlap of hard/soft skills.
     - **Experience Match Score (0–100):** Relevance of past roles, seniority, and tenure.
     - **Overall Recommendation:** Categorized into `strong_yes`, `yes`, `maybe`, or `no`.
     - **Key Strengths & Red Flags:** Highlighted insights and missing requirements.
  5. `saveResults`: Commits the `Screening` document to MongoDB and pushes real-time event.
- **Real-Time Notification via SSE:** Pushes `screening_complete` events directly to active recruiter browser sessions without manual page refreshing.

### Module 5: Interactive Candidate Kanban Pipeline
- **Visual Hiring Board (`/jobs/[jobId]/screening`):**
  - 5 Pipeline Stages:
    1. `applied` (Newly submitted)
    2. `screening` (Under evaluation)
    3. `interview` (Interviewing)
    4. `offered` (Offer extended)
    5. `hired` / `rejected` (Archived final states)
  - Drag-and-drop or 1-click stage transitions.
  - Live stage candidate counters and aggregate pipeline conversion metrics.
  - Quick filters by AI recommendation tier (`strong_yes`, `yes`, `maybe`, `no`) and score range.

### Module 6: 1-Click Candidate Email Dispatching
- **AI Email Drafting Agent:** Auto-generates contextual email drafts based on candidate name, job title, and current hiring stage (Interview Invitation, Rejection with feedback, Offer Letter notification).
- **Email Composer Dialog:** Pre-filled subject and body, fully editable by the recruiter before dispatch.
- **Email Delivery:** Direct dispatch via Resend transactional email API.
- **Audit Tracking:** Automatically registers an `EMAIL_SENT` event in the candidate activity timeline.

### Module 7: Centralized Talent Pool Directory (`/candidates`)
- **Global Talent Search:** Cross-job candidate discovery across the entire organization.
- **5-Block Filter Panel:**
  1. Free text search across candidate names, emails, and extracted skills.
  2. Job requisition filter.
  3. Pipeline stage filter.
  4. AI recommendation tier filter.
  5. Date range / freshness filter.
- **KPI Summary Cards:** Live counters for Total Talent, Screened Candidates, High Matches (`strong_yes`), and In-Progress Interviews.
- **Talent Pool CSV Export:** 1-click download of filtered candidate lists formatted for external CRM/HRIS integration.

### Module 8: Internal Recruiter Notes & Team Collaboration (`teamNotes`)
- **Collaborative Notes Feed:** Integrated on `/screening/[screeningId]` evaluation page.
- **Category Tagging:** `general` (Note), `interview` (Feedback), `salary` (Compensation), and `decision` (Hiring Call).
- **Author Attribution:** Populates author name, avatar initials, role badge (`Recruiter`, `Hiring Manager`, `Admin`), and timestamp.
- **Role-Based Deletion Guard:** Notes can only be deleted by the author who wrote them or by a platform Admin.
- **Privacy Shield:** Strictly internal; candidate API endpoints never expose `teamNotes`.

### Module 9: Candidate Activity Timeline & Audit Logs
- Chronological timeline tracking every lifecycle event for a candidate:
  - `UPLOADED`: Resume submitted.
  - `SCREENED`: AI evaluation finished.
  - `DECISION_CHANGED`: Stage or recommendation updated.
  - `EMAIL_SENT`: Notification emailed to candidate.
  - `NOTE_ADDED`: Internal team collaboration note posted (with preview snippet).
- Tracks user accountability (`performedBy` user reference or `"System AI"`).

### Module 10: Candidate AI Copilot Chat & Interview Question Generator
- **Candidate AI Chat (`candidateChatAgent`):** Floating conversational drawer allowing recruiters to ask questions about the candidate's resume (e.g., *"How many years of Next.js experience does this candidate have?"*).
- **Interview Question Generator:** Automatically generates customized behavioral, situational, and technical interview questions based on the candidate's specific resume gaps.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Feature / Resource | Platform Admin | Hiring Manager | Recruiter | Candidate (Public) |
| :--- | :---: | :---: | :---: | :---: |
| Create / Edit Jobs | Full | Full | View Only / Assigned | No Access |
| Upload Resumes | Full | Assigned Jobs | Assigned Jobs | Self-Apply Only |
| Trigger AI Screening | Full | Assigned Jobs | Assigned Jobs | No Access |
| Move Pipeline Stages | Full | Assigned Jobs | Assigned Jobs | No Access |
| Post Internal Team Notes | Full | Assigned Jobs | Assigned Jobs | No Access |
| Delete Team Notes | Any Note | Own Notes Only | Own Notes Only | No Access |
| Send Candidate Emails | Full | Assigned Jobs | Assigned Jobs | No Access |
| View Audit Logs | Full | Assigned Jobs | Assigned Jobs | No Access |
| Export Candidate CSV | Full | Assigned Jobs | Assigned Jobs | No Access |
| Track Status | Full | Assigned Jobs | Assigned Jobs | Own Status Only |

---

## 5. Non-Functional Requirements (NFR)

1. **API Performance:** Read operations respond in under 150ms; synchronous writes respond in under 300ms.
2. **Asynchronous Resilience:** Long-running AI tasks never block HTTP threads. BullMQ handles retry with exponential backoff on Redis.
3. **Data Security:** Passwords hashed with `bcryptjs` (salt factor 10); sessions managed via HTTP-only JWT cookies; MongoDB ObjectIds strictly sanitized.
4. **Availability & Error Handling:** Centralized Express error handler ensures standardized JSON error envelopes `{ success: false, message: "..." }`.
5. **Modern Browser Support:** Zero reliance on legacy polyfills; fully compatible with modern Chromium, Safari, and Firefox.
