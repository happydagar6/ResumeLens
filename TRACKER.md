# Active Work Tracker — ResumeLens

**Starting Point:** October 18, 2026 (Forward-looking tracking only)  
**Rule:** Contains only the current active feature and upcoming immediate steps. Updated regularly as features are built. No past history included.

---

## 1. Current Status Overview

| Attribute | Current Value |
| :--- | :--- |
| **Current State** | Foundation Documentation Complete; Ready for Next Active Feature |
| **Active Branch** | `main` |
| **Backend Status** | Online (Node/Express Port 5000, MongoDB Atlas, Upstash Redis) |
| **Frontend Status** | Online (Next.js 16 Port 3000) |
| **Blockers / P0 Bugs** | 0 active blockers |

---

## 2. Next Feature on Deck (Awaiting User Selection)

Select the next high-impact commercial ATS capability to build:

- [ ] **Option 1: 1-Click Candidate Interview Scheduling & Calendar Integration**
  - Generate automated interview scheduling links.
  - Recruiter Google Calendar / Outlook integration or Cal.com/Calendly link dispatch.
  - Candidate selects interview time slot; triggers automated calendar invite and confirmation email.

- [ ] **Option 2: Bulk Resume Batch Ingestion & Real-Time Upload Progress Queue**
  - Drag-and-drop 20+ resumes simultaneously.
  - Multi-threaded processing queue with individual progress bars per candidate.
  - Background batch AI screening with bulk status notifications.

- [ ] **Option 3: Advanced Hiring Analytics & Custom Pipeline Conversion Funnels**
  - Time-to-hire and stage conversion velocity charts (`applied` ➔ `interview` ➔ `hired`).
  - Recruiter productivity metrics (resumes screened, notes added, emails sent).
  - Source channel attribution (Referral vs Public Portal vs Sourced).

- [ ] **Option 4: Offer Letter Generator & E-Signature Workflow**
  - Template-based offer letter generation with compensation tokens.
  - PDF offer letter export with candidate acceptance tracking.

---

## 3. Active Feature Execution Checklist (Template for Current Feature)

When the active feature is confirmed, tasks will be tracked here in real-time:

- [ ] **Step 1: Database Schema & Modeling**
  - [ ] Define Mongoose schema fields and validation rules
  - [ ] Verify backward compatibility with existing MongoDB documents
  - [ ] Verify timestamps and default references

- [ ] **Step 2: Backend Controller & API Routes**
  - [ ] Create controller methods with validation and error handling
  - [ ] Implement RBAC authorization guards (`protect`, `authorize`)
  - [ ] Implement resource-level ownership and job scoping guards
  - [ ] Connect candidate activity audit logs (`createAuditLog`)

- [ ] **Step 3: Frontend Data Hooks & React Query**
  - [ ] Define query keys in hook modules
  - [ ] Implement `useQuery` hooks for data retrieval with defensive fallbacks
  - [ ] Implement `useMutation` hooks with query cache invalidation and toast alerts

- [ ] **Step 4: UI Components & Page Integration**
  - [ ] Build reusable UI components using Tailwind CSS and shadcn/ui
  - [ ] Embed component into target dashboard page
  - [ ] Ensure mobile responsiveness and dark mode compatibility

- [ ] **Step 5: End-to-End Verification & Testing**
  - [ ] Manual role-based access test across Admin, Hiring Manager, and Recruiter
  - [ ] Verify real-time cache updates and audit timeline synchronization
  - [ ] Git commit with conventional commit message

---

## 4. Active Bugs & Blockers Log

| Issue ID | Severity | Description | Status | Resolution / Action Required |
| :--- | :--- | :--- | :--- | :--- |
| *None* | - | System running cleanly with zero active issues | Resolved | - |

---

*Last Updated: October 18, 2026*
