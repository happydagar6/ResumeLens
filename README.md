# 🎯 ResumeLens — AI Recruitment & Applicant Tracking System

> A modern hiring platform built with **Next.js 16**, **React 19**, **Node.js/Express**, **OpenAI ChatGpt**, **BullMQ**, and **Redis**. ResumeLens helps hiring teams screen resumes automatically, score candidates fairly, compare top applicants, and schedule interview rounds in one place.

---

## ⚡ Why ResumeLens? (The Problem It Solves)

Hiring teams face major challenges when hiring for open roles:

- **Too Many Resumes to Review by Hand**: When a company posts a job, recruiters often receive 200+ resumes. Reading every PDF manually takes days, and good candidates can easily get overlooked.
- **Copy-Pasting Keywords into Resumes**: Many candidates simply copy words from the job description onto their resumes to pass basic filters. Older software only counts matching words without understanding real skills or experience.
- **Messy Tracking Across Spreadsheets & Emails**: Recruiters and interviewers often track candidates using messy Excel sheets, random email threads, and lost meeting links.
- **Candidates Wait Weeks for Updates**: Because review takes so long, candidates are left waiting with no status updates, creating a poor hiring experience.

### How ResumeLens Solves This:

1. **Automatic AI Resume Screening**: AI reads uploaded resumes in seconds, extracts real skills, and gives a clear match score (0–100%) based on job requirements.
2. **Fair & Transparent Evaluation**: Scores candidates on skills, experience, and project work—not just matching keywords.
3. **Smart Interview Question Generator**: Automatically creates relevant technical and behavioral interview questions tailored to each candidate's background.
4. **All-in-One Interview Hub (`/interviews`)**: View today's interviews, upcoming meetings, 1-click video call links (Google Meet, Zoom), and send email invites automatically.
5. **Fast & Real-Time Updates**: Background processing with **BullMQ + Redis** keeps the web app fast, and live updates show on the screen without needing to refresh the page.

---

## 🛠️ Tech Stack & Architecture

| Layer                       | Technologies                                                                                                                                                    |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                | **Next.js 16** (App Router, Turbopack), **React 19** (React Compiler), **Tailwind CSS v4**, **Radix UI**, **Lucide Icons**                                      |
| **State Management**        | **TanStack React Query v5** (Server-state caching & optimistic invalidation), **Zustand v5** (UI State)                                                         |
| **Backend API**             | **Node.js**, **Express.js**, **Mongoose** (MongoDB ODM), **CORS**, **Helmet**                                                                                   |
| **Async Queue & Cache**     | **BullMQ**, **Redis Cloud** (Distributed job queues with exponential backoff retry)                                                                             |
| **Artificial Intelligence** | **Google Gemini AI** (Resume analysis, candidate summary, tailored interview questions)                                                                         |
| **Real-Time Engine**        | **Server-Sent Events (SSE)** for zero-lag pipeline status streaming                                                                                             |
| **Notifications**           | **Resend API** (Automated candidate interview invitations and stage change alerts)                                                                              |
| **Security & Hardening**    | JWT auth (HTTP-only cookies), Role-Based Access Control (Admin, Recruiter, Hiring Manager), PDF magic-bytes validation, Redis rate-limiting tiers, IDOR defense |

---

## 🚀 Quick Setup Guide (Run in 2 Minutes)

### Prerequisites

Make sure you have installed:

- [Node.js 18+](https://nodejs.org)
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- [MongoDB](https://www.mongodb.com) (Local instance or MongoDB Atlas URI)
- [Redis](https://redis.io) (Local instance or Upstash / Redis Cloud URI)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/recruitai-project.git
cd recruitai-project
```

---

### Step 2: Configure & Start the Backend

1. Navigate to the backend directory and install dependencies:

   ```bash
   cd backend
   pnpm install
   ```

2. Create your environment configuration file:

   ```bash
   cp .env.example .env
   ```

3. Fill in your environment variables in `backend/.env`:

   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # Database & Redis
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/resumelens
   REDIS_URL=redis://default:<password>@<host>:<port>

   # Authentication
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
   JWT_EXPIRES_IN=7d

   # AI & Email Services
   GEMINI_API_KEY=your_google_gemini_api_key
   RESEND_API_KEY=your_resend_api_key
   ```

4. Start the backend development server:
   ```bash
   pnpm run dev
   ```
   _Backend will run on `http://localhost:5000`._

---

### Step 3: Configure & Start the Frontend

1. Open a new terminal, navigate to the frontend directory and install dependencies:

   ```bash
   cd frontend
   pnpm install
   ```

2. Create your environment configuration file:

   ```bash
   cp .env.example .env.local
   ```

3. Ensure `frontend/.env.local` contains:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   pnpm run dev
   ```
   _Frontend will run on `http://localhost:3000`._

---

## 🧪 Automated Testing & Production Verification

ResumeLens includes automated security and architectural test suites using **Jest** and **Supertest**:

```bash
# Run backend security test suite
cd backend
pnpm test
```

### What is tested:

- ✅ **IDOR Defense**: Prevents recruiters from accessing job requisitions outside their organization.
- ✅ **Auth Enforcement**: Verifies 401 Unauthorized rejection for protected endpoints.
- ✅ **Rate Limiting Protection**: Tests multi-tier Redis rate limiters against brute-force attacks.
- ✅ **MIME Type Magic Byte Defense**: Validates PDF signature verification (`%PDF-`) to reject disguised executables.
- ✅ **Safe Error Masking**: Confirms zero stack trace leakage to API consumers.

---

## 🛡️ Role-Based Access Control (RBAC)

ResumeLens features enterprise permissions out-of-the-box:

- 👑 **Admin**: Organization-wide oversight, user role provisioning, system audit logs (`/admin/users/audit-logs`), and all job pipelines.
- 💼 **Recruiter**: Requisition creation, resume parsing, candidate scoring, and interview coordination.
- 🎯 **Hiring Manager**: Restricted pipeline access, designated interview evaluation, and candidate notes.
- 👤 **Candidate**: Public application portal (`/apply/:jobId`) and real-time private status tracking (`/status/:resumeId`).

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 📸 Screenshots
Dashboard:
<img width="1917" height="985" alt="image" src="https://github.com/user-attachments/assets/9d468847-cd0d-462d-af26-c061d50d2a21" />

Candidates Page:
<img width="1917" height="987" alt="image" src="https://github.com/user-attachments/assets/e522b94b-fad1-4128-99b4-9d6a438f954f" />

User Management Page of the Application:
<img width="1917" height="1000" alt="image" src="https://github.com/user-attachments/assets/4efdfbb7-55e9-4b29-bb16-6c57e69aa040" />
