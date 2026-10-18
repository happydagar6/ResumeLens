# Design System & UI Guidelines — ResumeLens

**Standard:** Enterprise B2B SaaS (Linear, Ashby, Vercel Benchmark)  
**CSS Architecture:** Tailwind CSS v4 + tw-animate-css + shadcn/ui (Radix UI)  
**Theme Model:** OKLCH High-Chroma Vibrant Indigo/Violet Palette

---

## 1. Visual Philosophy & Design Principles

ResumeLens employs a high-contrast, data-dense, and micro-animated visual aesthetic engineered for recruiters who spend hours in front of candidate dashboards.
1. **High Information Density with Generous Breathing Room:** Whitespace and padded card structures prevent clutter while surfacing vital metrics at a glance.
2. **Subtle Glassmorphism & Micro-Interactions:** Light backdrop blur (`backdrop-blur-md`) on sticky navbars and drawers, with smooth CSS hover elevation (`shadow-xs` ➔ `shadow-md`).
3. **Semantic Color Coding:** Colors always convey operational state (e.g., green for hire, amber for compensation or review, purple for decisions, red for rejections or blockers).
4. **Accessible Contrast (WCAG AA):** High foreground-to-background contrast in both light and dark modes via OKLCH color spacing.

---

## 2. Color Palette & Token Reference (OKLCH)

### 2.1. Light Mode Tokens (`:root`)
- **Background:** `oklch(0.985 0.004 264)` — Clean off-white canvas with slight cool tint
- **Foreground:** `oklch(0.18 0.025 264)` — Deep indigo-tinted slate for ultra-crisp text
- **Card Background:** `oklch(1 0 0)` — Pure white
- **Card Foreground:** `oklch(0.18 0.025 264)`
- **Primary (Vibrant Indigo):** `oklch(0.52 0.255 264)` — Core interactive brand color (CTA buttons, active nav)
- **Primary Foreground:** `oklch(0.99 0 0)` — Crisp white text
- **Secondary (Soft Lavender):** `oklch(0.945 0.03 264)` — Subtle secondary pill buttons
- **Secondary Foreground:** `oklch(0.4 0.15 264)`
- **Muted Background:** `oklch(0.95 0.018 264)` — Table headers, composer backgrounds
- **Muted Foreground:** `oklch(0.5 0.07 264)` — Subtitles, metadata, timestamps
- **Accent (Violet):** `oklch(0.94 0.04 280)`
- **Accent Foreground:** `oklch(0.42 0.2 280)`
- **Destructive (Crimson):** `oklch(0.577 0.245 27.325)` — Delete and discard actions
- **Border / Input:** `oklch(0.88 0.02 264)` — Subtle border outlines

### 2.2. Dark Mode Tokens (`.dark`)
- **Background:** `oklch(0.115 0.025 264)` — Deep midnight obsidian
- **Foreground:** `oklch(0.96 0.01 264)` — High-clarity pearl text
- **Card Background:** `oklch(0.16 0.03 264)` — Raised slate-indigo container
- **Card Foreground:** `oklch(0.96 0.01 264)`
- **Primary (Bright Violet):** `oklch(0.68 0.24 275)` — High luminescence purple for dark mode visibility
- **Primary Foreground:** `oklch(0.1 0.02 264)`
- **Secondary:** `oklch(0.22 0.04 264)`
- **Muted:** `oklch(0.21 0.035 264)`
- **Muted Foreground:** `oklch(0.62 0.07 264)`
- **Destructive:** `oklch(0.704 0.191 22.216)`
- **Border / Input:** `oklch(1 0 0 / 10%)` — 10% translucent white border

### 2.3. Chart & Metric Visual Tokens
- **Chart 1 (Indigo):** `oklch(0.55 0.25 264)` — Overall Match
- **Chart 2 (Cyan):** `oklch(0.62 0.22 195)` — Technical Skills Match
- **Chart 3 (Emerald):** `oklch(0.65 0.22 150)` — Experience Relevance
- **Chart 4 (Amber):** `oklch(0.68 0.21 30)` — Compensation / Caution
- **Chart 5 (Violet):** `oklch(0.58 0.26 300)` — Final Hired Candidates

---

## 3. Typography & Hierarchy

ResumeLens uses the **Geist Sans** font family for general copy and **Geist Mono** for numeric metrics, badges, and timestamps.

| Level | Size / Weight | Line Height | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | 24px–28px / Bold (700) | 1.25 | `text-2xl font-bold tracking-tight` | Top of pages (Dashboard, Job title, Candidate Name) |
| **Section Title (H2)**| 18px–20px / Semibold (600) | 1.3 | `text-lg font-semibold tracking-tight` | Activity Timeline, Kanban Column, Notes Header |
| **Card Header (H3)** | 14px–16px / Semibold (600) | 1.4 | `text-base font-semibold` | Widget cards, Dialog titles |
| **Body (Default)** | 14px / Regular (400) | 1.6 | `text-sm leading-relaxed` | Note body, Job description, candidate summaries |
| **Sub-text / Meta** | 12px–13px / Medium (500) | 1.4 | `text-xs text-muted-foreground` | Timestamps, author role subtitle, badge counters |
| **Micro / Tag** | 10px–11px / Medium (500) | 1.2 | `text-[10px] uppercase tracking-wider` | Role badges, category pills, input labels |
| **Numeric Score** | 24px–32px / Extrabold (800)| 1.0 | `text-3xl font-bold font-mono` | Gauge match score, KPI counts |

---

## 4. Component Patterns & Visual Standards

### 4.1. Badge Standardization

#### Recommendation Tiers
- **Strong Yes:** `bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300`
- **Yes:** `bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-300`
- **Maybe:** `bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300`
- **No:** `bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300`

#### Note Categories
- **General (`general`):** `bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300` (Icon: `Tag`)
- **Interview Feedback (`interview`):** `bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300` (Icon: `Briefcase`)
- **Compensation (`salary`):** `bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300` (Icon: `DollarSign`)
- **Hiring Decision (`decision`):** `bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300` (Icon: `CheckCircle2`)

#### User Roles
- **Admin:** `border-red-500/40 text-red-600 dark:text-red-400`
- **Hiring Manager:** `border-indigo-500/40 text-indigo-600 dark:text-indigo-400`
- **Recruiter:** `border-sky-500/40 text-sky-600 dark:text-sky-400`

### 4.2. Cards & Surface Elevation
- **Border Radius:** Default `--radius` is `0.75rem` (`rounded-xl` or `rounded-lg`).
- **Shadows:** Standard cards use `shadow-xs border border-border/80`.
- **Hover Transitions:** Hoverable items apply `transition-all duration-150 hover:border-border hover:shadow-sm`.

### 4.3. Avatars & Initials
- Standard size: `h-7 w-7` or `h-8 w-8`.
- Fallback background: `bg-primary/10 text-primary font-semibold text-xs`.
- Extracts first letters of first and last name (`getInitials("Harsh Vardhan") ➔ "HV"`).

### 4.4. Dialogs & Modals
- Backdrop: `bg-black/80 backdrop-blur-xs`.
- Card container: `border bg-background shadow-lg max-w-lg sm:rounded-lg`.
- Clear footer actions: Secondary `Cancel` button on the left, Primary action on the right with loading spinner (`Loader2`).

---

## 5. Layout Architecture

1. **Dashboard Shell (`(dashboard)/layout.jsx`):**
   - Left Sidebar: Collapsible navigation links (Dashboard, Jobs, Candidates, Admin, Settings).
   - Top Navbar: Brand logo, active page breadcrumb, notifications bell drawer, theme toggle, and user avatar profile menu.
   - Main Content Area: Centered container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`.
2. **Kanban Board (`/jobs/[jobId]/screening`):**
   - Full-width fluid container with horizontal scrolling (`overflow-x-auto`).
   - Sticky column headers with candidate count badges.
3. **Candidate Evaluation Page (`/screening/[screeningId]`):**
   - Top Bar: Candidate name, Job link, PDF Export, Re-screen button, and Delete dialog.
   - Top Grid: 3-column overview (Match Score Gauge, Skills Breakdown, Candidate Summary).
   - Middle Section: Candidate Resume PDF viewer / Parsed Text tabs.
   - Collaboration Section: **Team Collaboration Notes** feed & composer.
   - Bottom Section: Chronological **Candidate Activity Timeline**.
   - Floating Widget: Always-visible bottom-right **AI Copilot Chat drawer**.
