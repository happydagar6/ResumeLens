# Active Work Tracker — ResumeLens

**Starting Point:** October 18, 2026 (Forward-looking tracking only)  
**Rule:** Contains only the current active feature and upcoming immediate steps. Updated regularly as features are built. No past history included.

---

## 1. Current Status Overview

| Attribute | Current Value |
| :--- | :--- |
| **Current Feature** | **Interview Scheduling & Calendar Management (Phase 7)** |
| **Status** | 🟡 Planning & Architecture Phase (Zero code written yet) |
| **Active Branch** | `main` |
| **Backend Status** | Online (Node/Express Port 5000, MongoDB Atlas, Upstash Redis) |
| **Frontend Status** | Online (Next.js 16 Port 3000) |
| **Blockers / P0 Bugs** | 0 active blockers |

---

## 2. Active Feature: Interview Scheduling & Calendar Management

### Goal:
Allow Recruiters, Hiring Managers, and Admins to schedule interview rounds (Technical, HR, System Design) for screened candidates with meeting links (Google Meet, Zoom, In-person), auto-transition the candidate pipeline stage to `interview`, dispatch confirmation emails to the candidate via Resend, and reflect the upcoming interview on the candidate's public status tracking page.

---

## 3. Step-by-Step Execution Plan

- [x] **Step 1: Database Model (`interviewModel.js`)**
  - [x] Define Mongoose schema: `resumeId`, `jobId`, `title`, `roundType`, `scheduledAt`, `duration`, `interviewer`, `meetingType`, `meetingLink`, `status`, `notes`, `createdBy`
  - [x] Index on `resumeId` and `jobId` for sub-10ms query performance
  - [x] Verify validation rules and default status (`scheduled`)

- [x] **Step 2: Backend Controller & Protected Routes (`interviewController.js`, `interviewRoutes.js`)**
  - [x] `POST /api/interviews` — Schedule a new interview round
  - [x] `GET /api/interviews/candidate/:resumeId` — Get all interviews for a candidate
  - [x] `GET /api/interviews` — Get upcoming interviews across recruiter's jobs
  - [x] `PUT /api/interviews/:id` — Reschedule interview (date/time/link) or update status (`completed`)
  - [x] `DELETE /api/interviews/:id` — Cancel interview with cancellation reason
  - [x] Automatic side effect: Auto-advance candidate decision to `"shortlisted"`
  - [x] Automatic side effect: Create `AuditLog` event (`INTERVIEW_SCHEDULED` / `INTERVIEW_RESCHEDULED` / `INTERVIEW_CANCELLED`)
  - [x] Role-based authorization (`admin`, `hiring_manager`, `recruiter`) + Job ownership check

- [x] **Step 3: Automated Candidate Notification via Resend**
  - [x] Connect `emailService.js` to dispatch professional interview calendar invite email to candidate with date, time, duration, and Google Meet/Zoom link

- [x] **Step 4: Candidate Public Status Portal Integration (`/status/[resumeId]`)**
  - [x] Expose upcoming interview round details on the public status stepper (privacy shielded: interviewer internal notes hidden)

- [x] **Step 5: Frontend Data Hooks (`use-interview.js`)**
  - [x] `useCandidateInterviews(resumeId)` with TanStack Query
  - [x] `useScheduleInterview()` mutation with automatic cache invalidation
  - [x] `useUpdateInterview()` mutation (reschedule / mark completed)
  - [x] `useCancelInterview()` mutation (soft-cancel with audit logging)

- [x] **Step 6: Frontend UI Components**
  - [x] `schedule-interview-dialog.jsx` — Dialog with Date/Time picker, round selector, duration, interviewer, and meeting URL
  - [x] `upcoming-interview-card.jsx` — Card on `/screening/[screeningId]` showing interview details, countdown, and meeting link
  - [x] Activity Timeline updated with interview milestone events
  - [x] Public Candidate Status Portal updated with Upcoming Interview banner & 1-click meeting join

- [ ] **Step 7: Verification & End-to-End Testing**
  - [ ] Schedule interview ➔ Verify MongoDB document created
  - [ ] Verify candidate stage moved to `shortlisted` on Kanban board
  - [ ] Verify Activity Timeline has `INTERVIEW_SCHEDULED` entry
  - [ ] Verify candidate public tracker displays upcoming interview details

---

## 4. Active Bugs & Blockers Log

| Issue ID | Severity | Description | Status | Resolution / Action Required |
| :--- | :--- | :--- | :--- | :--- |
| *None* | - | Baseline clean, no blockers | Open | - |

---

*Last Updated: October 18, 2026*
