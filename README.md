# 🏛️ Manas Hostel Mess Complaint Portal

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-black?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-black?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-black?style=flat&logo=postgresql)](https://neon.tech/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-black?style=flat)](https://orm.drizzle.team/)
[![Aesthetic](https://img.shields.io/badge/Design-1--Bit_Retro_Terminal-black?style=flat)](src/app/globals.css)
[![Infra Cost](https://img.shields.io/badge/Infra_Cost-$0.00_Zero_Recurring-black?style=flat)](#zero-cost-serverless-architecture)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat)](LICENSE)

> **High-speed, zero-cost, 1-bit retro mess complaint management portal engineered for Manas Hostel, Indian Institute of Technology (IIT) Guwahati.**  
> Built for instant dining-table QR code scanning by hostel boarders, active review and archival by the Services Managing Committee (SMC), and full administrative governance by Hostel Management.

---

## 📑 Table of Contents

- [Overview & Problem Statement](#-overview--problem-statement)
- [Architectural Pillars](#-architectural-pillars)
- [System Architecture](#-system-architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Anti-Abuse & Rate Limiting State Machine](#anti-abuse--rate-limiting-state-machine)
  - [Query-Time Archival Rollover Lifecycle](#query-time-archival-rollover-lifecycle)
- [Complete Route Directory](#-complete-route-directory)
  - [1. Boarder Routes (Students)](#1-boarder-routes-students)
  - [2. SMC Routes (Mess Committee)](#2-smc-routes-mess-committee)
  - [3. Administration Routes (Hostel Authority)](#3-administration-routes-hostel-authority)
  - [4. Streaming Export API Routes](#4-streaming-export-api-routes)
- [Route-by-Route Deep Dive](#-route-by-route-deep-dive)
  - [Boarder Route Specifications](#boarder-route-specifications)
  - [SMC Route Specifications](#smc-route-specifications)
  - [Admin Route Specifications](#admin-route-specifications)
  - [API Export Specifications](#api-export-specifications)
- [Database Schema (9 PostgreSQL Tables)](#-database-schema-9-postgresql-tables)
  - [Entity Relationship Diagram](#entity-relationship-diagram)
  - [Schema Definitions & Snapshot Immutability](#schema-definitions--snapshot-immutability)
- [Security Architecture & Hardening](#-security-architecture--hardening)
- [Design System & Performance Budget](#-design-system--performance-budget)
- [Core Business Logic & Algorithms](#-core-business-logic--algorithms)
- [Repository Structure](#-repository-structure)
- [Environment Variables Reference](#-environment-variables-reference)
- [Local Setup & Development](#-local-setup--development)
- [Testing & Quality Assurance (18 Suites)](#-testing--quality-assurance-18-suites)
- [Production Deployment Runbook](#-production-deployment-runbook)
- [Credits & License](#-credits--license)

---

## 🎯 Overview & Problem Statement

In large university residence halls like **Manas Hostel (IIT Guwahati)** housing 1,000+ residents across Blocks A, B, C, and D, mealtime catering feedback often suffers from severe operational bottlenecks:
- **Chaotic Feedback Loops**: Complaints scattered across informal WhatsApp groups or verbal arguments with mess staff leave no auditable paper trail.
- **Delayed Intervention**: Problems with uncooked food, foreign contaminants, or catering shortages are reported hours after a meal concludes, preventing timely inspection.
- **Spam & False Reporting**: Anonymized forms invite duplicate spam, while overly complex app logins deter genuine students eating at the tables.

### The Solution:
The **Manas Mess Complaint Portal** provides a frictionless table-side feedback pipeline:
1. **Boarders** scan an acrylic QR standee on their dining table, log in frictionlessly using their Block, Room, and Roll number, and submit verified complaints in under 15 seconds.
2. **SMC Representatives** inspect an active, Reddit-style complaint feed filtered by meal in real time during dining hours.
3. **Hostel Administrators** govern the system with bulk CSV/XLSX roster delta synchronization, Gala Dinner schedule overrides, moderation controls, immutable audit logging, and serverless Excel/PDF export pipelines.

---

## 🏛️ Architectural Pillars

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE ARCHITECTURAL PILLARS                        │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│    ZERO RECURRING   │   1-BIT MONOCHROME  │       ULTRA-LEAN PAYLOAD        │
│      INFRA COST     │      AESTHETIC      │            (< 50 KB)            │
│                     │                     │                                 │
│ Runs entirely on    │ Strict black/white  │ Zero external CDNs, self-hosted │
│ free-tier serverless│ terminal palette,   │ VT323 font (<18 KB), minimal JS,│
│ (Vercel + Neon).    │ 0px border-radius,  │ instant load even on congested  │
│ No Redis instance.  │ high-contrast text. │ 2G/3G dining hall networks.     │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```

1. **Zero Recurring Infrastructure Cost**: Runs 100% on the free tiers of **Vercel** (Hobby) and **Neon Serverless PostgreSQL** (via HTTP pooling). Requires **no Redis**, **no external workers**, and **no paid third-party add-ons**. All rate limiting, lockouts, and counters reside directly in indexed PostgreSQL tables.
2. **Strict 1-Bit Pixel Terminal Aesthetic**: Handcrafted retro terminal visual design adhering to pure `#000000`, `#ffffff`, and `#767676` (muted/disabled only), hard 2px borders, `0px` border-radius, high-contrast offset shadows (`3px 3px 0px #000`), and the iconic self-hosted **VT323** monospaced font.
3. **Extreme Client-Side Performance (< 50 KB Budget)**: Critical student route assets (HTML + CSS + Form JS + Font) transfer in under **38.2 KB**, delivering instant interaction and perfect Lighthouse performance on weak dining hall mobile connections.
4. **Data Immutability & Forensic Integrity**: Every complaint records an immutable snapshot of student details (name, course, academic year of study, block-room) at submission time. Historical records remain tamper-proof even when residents change rooms or update roster records.

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Dining Hall Client"]
        QR["Dining Table QR Standee"] -->|Phone Camera Scan| Browser["Mobile / Desktop Browser"]
    end

    subgraph Edge["Vercel Edge & Middleware"]
        Browser -->|HTTPS Request| MW["src/middleware.ts"]
        MW -->|1. Check CSP, HSTS, X-Frame-Options| SecurityHeaders["Security Headers"]
        MW -->|2. Verify CSRF Origin on POST| CSRFCheck["CSRF Guard"]
        MW -->|3. Validate Jose JWT Cookies| AuthCheck{"Auth Guard"}
    end

    subgraph AppRouter["Next.js 15 App Router Server Layer"]
        AuthCheck -->|Boarder Cookie| BoarderApp["Boarder Routes (/ , /login , /done)"]
        AuthCheck -->|SMC Cookie| SmcApp["SMC Routes (/smc/*)"]
        AuthCheck -->|Admin Cookie| AdminApp["Admin Routes (/admin/*)"]
        AuthCheck -->|Export Query| Exporters["Streaming Export APIs (/api/*)"]
    end

    subgraph LogicLayer["Server Actions & Business Logic"]
        BoarderApp --> SA_Complaint["submitComplaintAction"]
        BoarderApp --> SA_BAuth["loginBoarderAction"]
        SmcApp --> SA_SMC["loginSmcAction"]
        AdminApp --> SA_Roster["roster & delta engine"]
        AdminApp --> SA_Mod["moderation & lockouts"]
        Exporters --> DocGen["SheetJS (XLSX) + PDFKit (PDF)"]
    end

    subgraph DatabaseLayer["Neon Serverless PostgreSQL"]
        SA_Complaint --> Neon["@neondb/serverless (HTTP Pool)"]
        SA_BAuth --> Neon
        SA_SMC --> Neon
        SA_Roster --> Neon
        SA_Mod --> Neon
        DocGen --> Neon
        Neon --> Drizzle["Drizzle ORM Engine"]
        Drizzle --> Tables[(9 Relational Tables)]
    end
```

### Anti-Abuse & Rate Limiting State Machine

All abuse protection runs entirely inside PostgreSQL transactions without requiring Redis or in-memory caches:

```mermaid
stateDiagram-v2
    [*] --> FormSubmitted: Boarder Submits Complaint
    FormSubmitted --> HoneypotCheck: Inspect hidden website_hp field
    HoneypotCheck --> SilentDrop: website_hp has value (Bot Trap)
    SilentDrop --> [*]: Return success without saving

    HoneypotCheck --> ActiveLockoutCheck: website_hp is empty
    ActiveLockoutCheck --> RejectLockout: IP or Roll in active lockouts table
    RejectLockout --> [*]: Return Error (Wait 15 mins)

    ActiveLockoutCheck --> DeduplicationCheck: No active lockout
    DeduplicationCheck --> RejectDuplicate: Identical text by roll within last 24h
    RejectDuplicate --> [*]: Return Error ("Duplicate complaint")

    DeduplicationCheck --> RateLimitCheck: Unique text
    RateLimitCheck --> CheckMealLimit: Count submissions for meal today
    CheckMealLimit --> RejectMealLimit: >= 3 complaints for this meal
    RejectMealLimit --> [*]: Return Error ("Max 3/meal reached")

    CheckMealLimit --> CheckDayLimit: Count submissions for student today
    CheckDayLimit --> RejectDayLimit: >= 6 complaints today
    RejectDayLimit --> [*]: Return Error ("Max 6/day reached")

    CheckDayLimit --> CheckIPLimit: Count submissions for IP today
    CheckIPLimit --> RejectIPLimit: >= 40 complaints from IP today
    RejectIPLimit --> [*]: Return Error ("IP rate limit reached")

    CheckIPLimit --> PersistSnapshot: All limits passed
    PersistSnapshot --> LogSubmission: Insert into complaints & submission_log
    LogSubmission --> [*]: Redirect to /done
```

### Query-Time Archival Rollover Lifecycle

Rather than maintaining fragile cron jobs, scheduled lambda triggers, or external workers, complaints are partitioned dynamically using an **Asia/Kolkata (IST)** monthly boundary calculation at query time (`getActiveFeedCutoffDate()`):

```mermaid
timeline
    title Dynamic Monthly Archival Lifecycle (IST Timezone)
    Month M (1st to Last Day) : Complaints submitted during Month M : Displayed live in /smc/complaints feed
    Month M+1 (1st to 7th Day) : Grace review period : Complaints from Month M remain visible in /smc/complaints
    Month M+1 (7th Day 23:59:59 IST) : Final second of active feed window : Last chance for active review
    Month M+1 (8th Day 00:00:00 IST) : Dynamic Cutoff Trigger : Complaints from Month M automatically roll into /smc/archive under Month M-Year view
```

---

## 🗺️ Complete Route Directory

The application partitions functionality into **three authenticated user planes** and **two streaming export endpoints**:

```
                                  ┌─────────────────────────────┐
                                  │      Dining Table QR        │
                                  │     (Scan via Camera)       │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Next.js 15 App Router                                 │
│                                (Hosted on Vercel Hobby Tier)                            │
├───────────────────────────────┬───────────────────────────┬─────────────────────────────┤
│        Boarder Routes         │        SMC Routes         │        Admin Routes         │
│  • /login                     │  • /smc (Login)           │  • /admin/login             │
│  • / (Complaint Form)         │  • /smc/complaints (Feed) │  • /admin (Dashboard)       │
│  • /done (Confirmation)       │  • /smc/archive (Monthly) │  • /admin/roster (CSV/XLSX) │
│                               │  • /smc/forgot (Support)  │  • /admin/smc (Provision)   │
│                               │                           │  • /admin/gala (Scheduler)  │
│                               │                           │  • /admin/complaints (Mod)  │
│                               │                           │  • /admin/logs (Lockouts)   │
│                               │                           │  • /admin/export (Backups)  │
│                               │                           │  • /admin/qr (Standees)     │
├───────────────────────────────┴───────────────────────────┴─────────────────────────────┤
│                                Streaming Export API Routes                              │
│  • GET /api/export/complaints (SMC & Admin Excel / PDF stream)                          │
│  • GET /api/admin/export (Admin Full Database System Backup stream)                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Boarder Routes (Students)
| Path | Methods | Middleware Guard | Description |
|---|---|---|---|
| [`/login`](src/app/login/page.tsx) | `GET` | Public (redirects to `/` if authenticated) | Boarder authentication via Block, Room, and Roll number against the active student roster. |
| [`/`](src/app/page.tsx) | `GET` | Boarder Session (`manas_boarder_session`) | Core complaint form with read-only student details banner, dynamic meal radios, 2000-char counter, and honeypot. |
| [`/done`](src/app/done/page.tsx) | `GET` | Boarder Session (`manas_boarder_session`) | Submission confirmation receipt with quick links to file another complaint or log out. |

### 2. SMC Routes (Mess Committee)
| Path | Methods | Middleware Guard | Description |
|---|---|---|---|
| [`/smc`](src/app/smc/page.tsx) | `GET` | Public (redirects to feed if authenticated) | SMC representative sign-in page using Roll Number and password. |
| [`/smc/complaints`](src/app/smc/complaints/page.tsx) | `GET` | SMC or Admin Session | Real-time complaint feed with meal filtering (`all`, `breakfast`, `lunch`, `snacks`, `dinner`, `gala_dinner`) and 25-item pagination. |
| [`/smc/archive`](src/app/smc/archive/page.tsx) | `GET` | SMC or Admin Session | Monthly complaint archive grouped chronologically by Month-Year with pagination and export triggers. |
| [`/smc/forgot`](src/app/smc/forgot/page.tsx) | `GET` | Public | Support contact guidance page for SMC representatives who forgot their credentials. |

### 3. Administration Routes (Hostel Authority)
| Path | Methods | Middleware Guard | Description |
|---|---|---|---|
| [`/admin/login`](src/app/admin/login/page.tsx) | `GET` | Public (redirects to `/admin` if authenticated) | Secure administrator sign-in portal for Super Admin and Secondary Admins. |
| [`/admin`](src/app/admin/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Administrative dashboard displaying high-level counts and secondary admin account creation (capped at 3). |
| [`/admin/roster`](src/app/admin/roster/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Bulk student roster management: CSV/XLSX file upload preview, delta computation, atomic commits, and inline editing. |
| [`/admin/smc`](src/app/admin/smc/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | SMC representative provisioning: create reps with auto-generated 10-char passwords, reset credentials, toggle access. |
| [`/admin/gala`](src/app/admin/gala/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Gala Dinner date scheduler: schedule or remove special festival dates (`YYYY-MM-DD`). |
| [`/admin/complaints`](src/app/admin/complaints/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Comprehensive moderation desk: inspect active/archived/deleted complaints, soft-delete with justification, restore. |
| [`/admin/logs`](src/app/admin/logs/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Security console: view login failures, rate-limit hits, and inspect or clear active IP/Roll number lockouts. |
| [`/admin/export`](src/app/admin/export/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | System data backup panel: download complete unpaginated complaints, roster, audit logs, and security logs in XLSX/PDF. |
| [`/admin/qr`](src/app/admin/qr/page.tsx) | `GET` | Admin Session (`manas_admin_session`) | Print-ready A4 dining table standee generator featuring centered vector SVG QR code and scan instructions. |

### 4. Streaming Export API Routes
| Path | Methods | Middleware Guard | Description |
|---|---|---|---|
| [`/api/export/complaints`](src/app/api/export/complaints/route.ts) | `GET` | SMC or Admin Session | Streams filtered active or archived complaints as binary `.xlsx` spreadsheets or `.pdf` documents. |
| [`/api/admin/export`](src/app/api/admin/export/route.ts) | `GET` | Admin Session | Streams complete unpaginated system backups for `complaints`, `roster`, `audit`, or `logs` in `.xlsx` or `.pdf`. |

---

## 🔍 Route-by-Route Deep Dive

### Boarder Route Specifications

#### `GET /login`
- **Component**: [`src/app/login/page.tsx`](src/app/login/page.tsx) & [`src/app/login/BoarderLoginForm.tsx`](src/app/login/BoarderLoginForm.tsx)
- **Access**: Public. If `manas_boarder_session` cookie is valid, automatically redirects to `/`.
- **Form Inputs**:
  - `block`: Select dropdown (`A`, `B`, `C`, `D`).
  - `roomNumber`: Text input (1 to 10 characters, trimmed).
  - `rollNumber`: Text input (alphanumeric, converted to uppercase).
- **Server Action Triggered**: `loginBoarderAction(formData)` in [`src/actions/boarder-auth.ts`](src/actions/boarder-auth.ts)
- **Database Operations**:
  1. Checks active lockout in `lockouts` for client IP and Roll Number.
  2. Queries `students` table where `roll_number = rollNumber` AND `is_active = true`.
  3. Validates matching `block` and `room_number` (case-insensitive).
  4. On failure: inserts failure into `login_attempts`. If 5 failures occur in 15 minutes, inserts 15-minute record into `lockouts`.
  5. On success: clears failed attempts, creates signed Jose JWT (14-day validity), sets `manas_boarder_session` `HttpOnly` cookie, redirects to `/`.

#### `GET /`
- **Component**: [`src/app/page.tsx`](src/app/page.tsx) & [`src/app/ComplaintForm.tsx`](src/app/ComplaintForm.tsx)
- **Access**: Protected. Requires valid `manas_boarder_session` cookie; otherwise redirects to `/login`.
- **Server-Side Data Fetched**:
  - Student record from database using JWT session ID.
  - Dynamically computed **Academic Year of Study** (e.g. `"2nd Year"`).
  - Active Gala Dinner status for current Asia/Kolkata date from `gala_dates`.
- **Form Inputs**:
  - `meal`: Radio option (`breakfast`, `lunch`, `snacks`, `dinner`, or `gala_dinner` if today is a registered Gala date).
  - `complaintText`: Textarea (enforces 10 to 2000 characters with live character counter).
  - `website_hp`: Hidden honeypot field.
- **Server Action Triggered**: `submitComplaintAction(formData)` in [`src/actions/submit-complaint.ts`](src/actions/submit-complaint.ts)
- **Database Operations**:
  1. Traps bot if `website_hp` is non-empty (returns simulated success without saving).
  2. Enforces client IP and roll number lockout checks.
  3. Verifies deduplication: rejects if identical text submitted by student within last 24 hours.
  4. Enforces rate limits: max 3/meal today, max 6/day total, max 40/day per client IP.
  5. Inserts new record into `complaints` with frozen student snapshots (`name_snapshot`, `block_room_snap`, `course_snapshot`, `year_of_study`).
  6. Inserts attempt record into `submission_log`.
  7. Redirects student to `/done`.

#### `GET /done`
- **Component**: [`src/app/done/page.tsx`](src/app/done/page.tsx)
- **Access**: Protected. Requires valid `manas_boarder_session` cookie.
- **UI Presentation**: Displays success acknowledgment box in 1-bit typography, with options to *"Submit Another Complaint"* (`/`) or *"Logout"* (triggers `logoutBoarderAction`).

---

### SMC Route Specifications

#### `GET /smc`
- **Component**: [`src/app/smc/page.tsx`](src/app/smc/page.tsx) & [`src/app/smc/SmcLoginForm.tsx`](src/app/smc/SmcLoginForm.tsx)
- **Access**: Public. If `manas_smc_session` cookie is valid, redirects to `/smc/complaints`.
- **Form Inputs**: `rollNumber` (Hostel Roll Number) and `password`.
- **Server Action Triggered**: `loginSmcAction(formData)` in [`src/actions/smc-auth.ts`](src/actions/smc-auth.ts)
- **Database Operations**:
  1. Checks `lockouts` for client IP and Roll Number.
  2. Queries `smc_users` where `roll_number = rollNumber` AND `is_active = true`.
  3. Compares password hash via `bcrypt.compare`.
  4. On failure: logs to `login_attempts` and triggers 15-minute lockout upon 5 strikes.
  5. On success: sets 7-day `manas_smc_session` cookie and redirects to `/smc/complaints`.

#### `GET /smc/complaints`
- **Component**: [`src/app/smc/complaints/page.tsx`](src/app/smc/complaints/page.tsx) & [`src/app/smc/complaints/SmcComplaintCard.tsx`](src/app/smc/complaints/SmcComplaintCard.tsx)
- **Access**: SMC or Admin session.
- **URL Query Parameters**:
  - `meal`: Filter by meal (`all`, `breakfast`, `lunch`, `snacks`, `dinner`, `gala_dinner`).
  - `page`: Page index (default `1`, 25 items per page).
- **Server-Side Data Fetched**:
  - Dynamically calculates active feed cutoff: complaints from Month $M$ are shown until the 7th day of Month $M+1$ at 23:59:59 IST.
  - Fetches complaints where `is_deleted = false` and `created_at >= cutoff`.
  - Computes counts across each meal category to populate filter tab badges.
- **Export Trigger**: Includes button linking to `/api/export/complaints?view=active&meal=...` for instant Excel or PDF generation.

#### `GET /smc/archive`
- **Component**: [`src/app/smc/archive/page.tsx`](src/app/smc/archive/page.tsx)
- **Access**: SMC or Admin session.
- **URL Query Parameters**:
  - `month`: Target month in `YYYY-MM` format (e.g. `2026-09`).
  - `meal`: Filter by meal type.
  - `page`: Page index (25 items per page).
- **Server-Side Data Fetched**:
  - Generates list of all past calendar months possessing complaints created before the active cutoff.
  - Queries complaints for selected month window with pagination.
- **Export Trigger**: Direct link to `/api/export/complaints?view=archive&month=YYYY-MM&format=xlsx|pdf`.

#### `GET /smc/forgot`
- **Component**: [`src/app/smc/forgot/page.tsx`](src/app/smc/forgot/page.tsx)
- **Access**: Public.
- **UI Content**: Helpful terminal-styled card instructing representatives to contact the Super Administrator (Welfare Secretary) for credential resets via the Admin console.

---

### Admin Route Specifications

#### `GET /admin/login`
- **Component**: [`src/app/admin/login/page.tsx`](src/app/admin/login/page.tsx) & [`src/app/admin/login/AdminLoginForm.tsx`](src/app/admin/login/AdminLoginForm.tsx)
- **Access**: Public. If `manas_admin_session` cookie is valid, redirects to `/admin`.
- **Form Inputs**: `username` and `password`.
- **Server Action Triggered**: `loginAdminAction(formData)` in [`src/actions/admin-auth.ts`](src/actions/admin-auth.ts)
- **Special First-Run Logic**: Auto-bootstraps Super Admin account from environment variables (`SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`) if no administrator account exists in database.
- **Database Operations**:
  1. Validates against `admins` table.
  2. Compares password hash with `bcrypt`.
  3. Writes attempt to `login_attempts`.
  4. On success: writes `admin_login` entry to `audit_log`, issues 24-hour `manas_admin_session` cookie, redirects to `/admin`.

#### `GET /admin`
- **Component**: [`src/app/admin/page.tsx`](src/app/admin/page.tsx) & [`src/app/admin/AdminManagePanel.tsx`](src/app/admin/AdminManagePanel.tsx)
- **Access**: Admin Session.
- **Dashboard Metrics**: Total students, total active complaints, active SMC representatives, active lockouts.
- **Secondary Admin Management**:
  - Lists existing administrator accounts.
  - Form to create secondary admin (strictly capped at 3 total administrators in database).
  - Server Action: `createSecondaryAdminAction` (enforces password complexity: 8+ chars, upper, lower, number, special char).
  - Server Action: `deactivateAdminAction` (super admins cannot be deactivated).

#### `GET /admin/roster`
- **Component**: [`src/app/admin/roster/page.tsx`](src/app/admin/roster/page.tsx) & [`src/app/admin/roster/RosterManager.tsx`](src/app/admin/roster/RosterManager.tsx)
- **Access**: Admin Session.
- **Capabilities**:
  1. **Bulk Upload Preview**: Accepts `.csv`, `.xlsx`, or `.xls` student rosters. Validates columns: `Roll Number`, `Name`, `Block`, `Room`, `Course`, `Year of Joining`.
  2. **Delta Engine**: Computes exact diff against database:
     - `toInsert`: New roll numbers detected.
     - `toUpdate`: Existing students with modified rooms, courses, or names.
     - `toDeactivate`: Students currently in database missing from uploaded sheet.
  3. **Atomic Commit**: Server Action `commitRosterDeltaAction` applies all insertions, updates, and deactivations inside a single database transaction and writes to `audit_log`.
  4. **Inline Editor**: Search student by roll number, edit Block and Room directly, and save via `updateStudentRecordAction`.

#### `GET /admin/smc`
- **Component**: [`src/app/admin/smc/page.tsx`](src/app/admin/smc/page.tsx) & [`src/app/admin/smc/SmcAccountManager.tsx`](src/app/admin/smc/SmcAccountManager.tsx)
- **Access**: Admin Session.
- **Capabilities**:
  1. **Provision Representative**: Server Action `createSmcAccountAction` generates a secure random 10-character alphanumeric password and displays it once to the administrator.
  2. **Password Reset**: Server Action `resetSmcPasswordAction` generates a new temporary password.
  3. **Toggle Status**: Server Action `toggleSmcStatusAction` activates or deactivates representative access immediately.
  4. All provisioning actions log to `audit_log`.

#### `GET /admin/gala`
- **Component**: [`src/app/admin/gala/page.tsx`](src/app/admin/gala/page.tsx) & [`src/app/admin/gala/GalaDateManager.tsx`](src/app/admin/gala/GalaDateManager.tsx)
- **Access**: Admin Session.
- **Capabilities**:
  - Add festival or gala dates (`YYYY-MM-DD`) with descriptions (e.g. *"Manas Freshers Gala 2026"*).
  - Delete scheduled dates.
  - Server Actions: `createGalaDateAction`, `deleteGalaDateAction`.

#### `GET /admin/complaints`
- **Component**: [`src/app/admin/complaints/page.tsx`](src/app/admin/complaints/page.tsx) & [`src/app/admin/complaints/AdminComplaintModerator.tsx`](src/app/admin/complaints/AdminComplaintModerator.tsx)
- **Access**: Admin Session.
- **Capabilities**:
  - View all complaints (active, archived, or soft-deleted).
  - **Soft-Delete**: Requires mandatory text justification (minimum 5 characters). Sets `is_deleted = true`, records `deleted_by` (admin username), and writes reason.
  - **Restore**: Restores accidentally deleted complaints back to active state.
  - Server Actions: `softDeleteComplaintAction`, `restoreComplaintAction`.

#### `GET /admin/logs`
- **Component**: [`src/app/admin/logs/page.tsx`](src/app/admin/logs/page.tsx) & [`src/app/admin/logs/SecurityLogsViewer.tsx`](src/app/admin/logs/SecurityLogsViewer.tsx)
- **Access**: Admin Session.
- **Capabilities**:
  - Inspect recent authentication logs (`login_attempts`).
  - Inspect rate limit triggers (`submission_log`).
  - Inspect active lockouts (`lockouts`).
  - **One-Click Unlock**: Server Action `clearLockoutAction` releases locked student roll numbers or IP addresses instantly with audit trail logging.

#### `GET /admin/export`
- **Component**: [`src/app/admin/export/page.tsx`](src/app/admin/export/page.tsx) & [`src/app/admin/export/AdminExportPanel.tsx`](src/app/admin/export/AdminExportPanel.tsx)
- **Access**: Admin Session.
- **Capabilities**: Download full unpaginated system backups for `complaints`, `roster`, `audit_log`, and `login_attempts` in `.xlsx` or `.pdf` format.

#### `GET /admin/qr`
- **Component**: [`src/app/admin/qr/page.tsx`](src/app/admin/qr/page.tsx) & [`src/app/admin/qr/TableQrCard.tsx`](src/app/admin/qr/TableQrCard.tsx)
- **Access**: Admin Session.
- **Capabilities**: Generates an A4 print-optimized acrylic standee card containing dining instructions and a centered, resolution-independent vector SVG QR code pointing to the portal root URL (`NEXT_PUBLIC_APP_URL`).

---

### API Export Specifications

#### `GET /api/export/complaints`
- **Route Handler**: [`src/app/api/export/complaints/route.ts`](src/app/api/export/complaints/route.ts)
- **Authentication**: SMC or Admin session cookie. Returns `401 Unauthorized` JSON if missing.
- **Query Parameters**:
  - `view`: `active` or `archive` (default `active`).
  - `format`: `xlsx` (default) or `pdf`.
  - `meal`: `all`, `breakfast`, `lunch`, `snacks`, `dinner`, `gala_dinner`.
  - `month`: `YYYY-MM` (required if `view=archive`).
- **Response**: Binary stream with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf`, and dynamic attachment headers (e.g. `complaints_active_all_2026-10-12.xlsx`).

#### `GET /api/admin/export`
- **Route Handler**: [`src/app/api/admin/export/route.ts`](src/app/api/admin/export/route.ts)
- **Authentication**: Admin session cookie. Returns `401 Unauthorized` JSON if missing.
- **Query Parameters**:
  - `type`: `complaints`, `roster`, `audit`, or `logs`.
  - `format`: `xlsx` (default) or `pdf`.
- **Response**: Full, unpaginated dataset streamed directly as binary spreadsheet or formatted tabular PDF document.

---

## 🗄️ Database Schema (9 PostgreSQL Tables)

### Entity Relationship Diagram

```mermaid
erDiagram
    STUDENTS ||--o{ COMPLAINTS : "submits"
    STUDENTS {
        serial id PK
        varchar roll_number UK
        varchar name
        varchar block
        varchar room_number
        varchar course
        integer year_of_joining
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    COMPLAINTS {
        serial id PK
        integer student_id FK
        varchar roll_number
        varchar name_snapshot
        varchar block_room_snap
        varchar course_snapshot
        varchar year_of_study
        varchar meal
        text complaint_text
        boolean is_deleted
        varchar deleted_by
        text deleted_reason
        timestamp created_at
    }

    SMC_USERS {
        serial id PK
        varchar roll_number UK
        varchar password_hash
        varchar name
        boolean is_active
        timestamp created_at
    }

    ADMINS {
        serial id PK
        varchar username UK
        varchar password_hash
        boolean is_super_admin
        boolean is_active
        timestamp created_at
    }

    GALA_DATES {
        serial id PK
        varchar gala_date UK
        varchar description
        timestamp created_at
    }

    LOGIN_ATTEMPTS {
        serial id PK
        varchar identifier
        varchar ip_address
        varchar user_type
        varchar outcome
        timestamp attempted_at
    }

    SUBMISSION_LOG {
        serial id PK
        varchar roll_number
        varchar ip_address
        varchar meal
        varchar outcome
        timestamp attempted_at
    }

    LOCKOUTS {
        serial id PK
        varchar key_type
        varchar key_value
        timestamp locked_until
        varchar reason
        timestamp created_at
    }

    AUDIT_LOG {
        serial id PK
        varchar actor_type
        varchar actor_id
        varchar action
        varchar target_type
        varchar target_id
        text details
        timestamp created_at
    }
```

### Schema Definitions & Snapshot Immutability

Defined in [`src/db/schema.ts`](src/db/schema.ts):

1. **`students`**: Master boarder roster. Stores `roll_number` (unique index), `name`, `block` (`A`, `B`, `C`, `D`), `room_number`, `course`, `year_of_joining`, and active status flag.
2. **`complaints`**: Immutable complaint logs. Stores frozen student snapshots:
   - `name_snapshot`: Name of the boarder when submitted.
   - `block_room_snap`: Block and room when submitted (e.g. `"A-214"`).
   - `course_snapshot`: Enrolled course (e.g. `"BTech CSE"`).
   - `year_of_study`: Dynamically calculated year at submission time (e.g. `"2nd Year"`).
   - `is_deleted`, `deleted_by`, `deleted_reason`: Soft deletion audit fields.
3. **`smc_users`**: Mess committee accounts with bcrypt-hashed passwords.
4. **`admins`**: Administrator credentials (`is_super_admin` flag, max 3 accounts).
5. **`gala_dates`**: Calendar dates (`YYYY-MM-DD`) where Dinner is replaced by Gala Dinner.
6. **`login_attempts`**: Security trail of successful and failed authentication requests.
7. **`submission_log`**: Real-time counter of complaint attempts per roll number, IP address, and meal slot for anti-abuse limit evaluation.
8. **`lockouts`**: Active IP and roll number bans with expiration timestamps.
9. **`audit_log`**: Immutable forensic log of all administrative actions.

---

## 🔒 Security Architecture & Hardening

Security is enforced at the edge, server action layer, and database constraints:

### 1. HTTP Security Headers
Every HTTP response is guarded by strict security headers declared in [`src/middleware.ts`](src/middleware.ts):
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
```

### 2. Session Isolation & Token Security
- Three separate `HttpOnly`, `SameSite=Lax` cookies:
  - `manas_boarder_session` (14 days)
  - `manas_smc_session` (7 days)
  - `manas_admin_session` (24 hours)
- Signed using **Jose JWT** (`HS256`) with a 64-character secret.
- Session tokens **do not slide**, closing session fixation attack vectors.
- Production environment enforces `Secure` cookie transmission over HTTPS.

### 3. CSRF & Mutation Origin Verification
All state-modifying requests (`POST`, `PUT`, `PATCH`, `DELETE`) are verified in `src/middleware.ts` by comparing incoming `Origin` and `Host` headers. External cross-origin requests are rejected with `403 Forbidden`.

### 4. Brute-Force & Denial-of-Service Defense
- **5 Failed Login Attempts** within 15 minutes trigger an automated **15-minute ban** recorded in `lockouts`.
- Per-meal limits (3/meal) and per-day limits (6/day per student, 40/day per IP) prevent dining hall denial-of-service floods.
- Zero Redis dependency — all atomic counters are evaluated using indexed SQL queries.

---

## 🎨 Design System & Performance Budget

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1-BIT RETRO TERMINAL DESIGN SPEC                      │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ Background Color    │ #ffffff (Pure White)                                  │
│ Foreground Color    │ #000000 (Pure Black)                                  │
│ Disabled / Muted    │ #767676 (Medium Gray - WCAG AAA compliant)            │
│ Border Width        │ 2px solid #000000                                     │
│ Border Radius       │ 0px !important (Strict Sharp Pixel Corners)           │
│ Box Offset Shadow   │ 3px 3px 0px #000000                                   │
│ Primary Font        │ "VT323", monospace (Self-hosted WOFF2, 17.52 KB)       │
│ Mobile Payload      │ 38.12 KB total transfer (strictly under 50 KB budget) │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

The design system lives entirely in [`src/app/globals.css`](src/app/globals.css) and uses custom CSS properties:
- `--bg`: `#ffffff`
- `--fg`: `#000000`
- `--disabled`: `#767676`
- `--border-width`: `2px`
- `--shadow-offset`: `3px`

All buttons, inputs, dropdowns, and cards feature sharp 0px corners, high-contrast offset drop shadows, and visual feedback upon `:active` press (`transform: translate(2px, 2px)`).

---

## ⚡ Core Business Logic & Algorithms

### 1. Dynamic Academic Year of Study Calculation
The student's year of study is computed on-the-fly using an Asia/Kolkata **1 July** academic calendar cutoff:
```typescript
const currentYear = istDate.getFullYear();
const currentMonth = istDate.getMonth() + 1; // 1 to 12
const academicStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
const yearNumber = academicStartYear - yearOfJoining + 1;

// Mapped to ordinal strings: "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"
```
If the calculated year is less than 1 or greater than 6, it flags safely as `"Check roster"`.

### 2. Gala Dinner Replacement Engine
When an administrator registers a Gala date (`YYYY-MM-DD`) in `/admin/gala`, the portal checks today's date in Asia/Kolkata time. If active:
- The standard `"Dinner"` meal option is replaced with `"Gala Dinner"` in the UI form.
- The backend validates `"gala_dinner"` submissions and deducts from the evening meal rate-limit quota.

### 3. In-Process Serverless Document Exports
Document generation runs completely in-process using standard JavaScript streaming without heavy headless browsers:
- **Excel Generation**: [SheetJS](https://sheetjs.com/) builds binary workbook buffers with formatted column widths and header styles in milliseconds.
- **PDF Generation**: [PDFKit](https://pdfkit.org/) streams clean monochrome tabular layouts directly to Node buffers and `NextResponse`.

---

## 📁 Repository Structure

```
manas-mess-complaints/
├── public/
│   └── fonts/
│       └── vt323.woff2             # Self-hosted subsetted font (17.52 KB)
├── src/
│   ├── actions/                    # Next.js Server Actions
│   │   ├── admin-auth.ts           # Admin login, secondary admin creation
│   │   ├── admin-smc.ts            # SMC user provisioning & password reset
│   │   ├── boarder-auth.ts         # Boarder login & session termination
│   │   ├── gala.ts                 # Gala dinner scheduler actions
│   │   ├── moderation.ts           # Complaint soft-deletion & restoration
│   │   ├── roster.ts               # Roster parser & atomic delta engine
│   │   ├── security.ts             # Lockout clearing actions
│   │   ├── smc-auth.ts             # SMC login & logout actions
│   │   └── submit-complaint.ts     # Anti-abuse validation & submission
│   ├── app/                        # App Router Pages & Layouts
│   │   ├── admin/                  # Admin console pages
│   │   ├── api/                    # Streaming export endpoints
│   │   ├── done/                   # Boarder submission confirmation
│   │   ├── login/                  # Boarder authentication page
│   │   ├── smc/                    # SMC review feed & archive pages
│   │   ├── globals.css             # 1-bit monochrome design tokens
│   │   ├── layout.tsx              # Root HTML wrapper with VT323 font
│   │   └── page.tsx                # Boarder complaint submission form
│   ├── db/
│   │   ├── index.ts                # Neon Serverless PostgreSQL connection
│   │   ├── schema.ts               # 9 Drizzle relational tables
│   │   └── seed.ts                 # Sample seed script for development
│   ├── lib/                        # Core utilities & domain logic
│   │   ├── auth.ts                 # Jose JWT signing & cookie helpers
│   │   ├── date-utils.ts           # Asia/Kolkata timezone & cutoffs
│   │   ├── env-check.ts            # Pre-flight environment diagnostics
│   │   ├── export.ts               # SheetJS & PDFKit document streaming
│   │   ├── gala.ts                 # Gala date lookup helper
│   │   └── qr.ts                   # Resolution-independent vector SVG QR
│   └── middleware.ts               # Edge security headers & route guards
├── tests/                          # 18 automated test suites (250+ assertions)
├── drizzle.config.ts               # Drizzle kit schema & migration config
├── next.config.ts                  # Next.js framework configuration
├── tsconfig.json                   # Strict TypeScript compiler options
├── DEPLOYMENT.md                   # Production deployment manual
└── package.json                    # Project dependencies & scripts
```

---

## ⚙️ Environment Variables Reference

| Variable Name | Required | Default / Format | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require` | Neon Serverless PostgreSQL pooled connection string. |
| `JWT_SECRET` | **Yes** | 64-character hexadecimal string | Secret key for signing Jose JWT session cookies. |
| `SUPER_ADMIN_USERNAME` | **Yes** | `admin` | Username for the primary Super Administrator account. |
| `SUPER_ADMIN_PASSWORD` | **Yes** | Complex password string | Password used to auto-bootstrap Super Admin on first run. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://manas-mess.vercel.app` | Canonical site URL (encoded into table QR codes). |
| `NEXT_PUBLIC_SITE_URL` | No | Matches `NEXT_PUBLIC_APP_URL` | Secondary canonical site origin fallback. |
| `NODE_ENV` | No | `production` / `development` | Node environment flag (`production` enforces HTTPS cookies). |

---

## 🛠️ Local Setup & Development

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**: v9+
- A free **Neon Serverless PostgreSQL** database ([neon.tech](https://neon.tech))

### 2. Clone & Install
```bash
git clone https://github.com/aditya-prabhakar-13/manas-mess-complaints.git
cd manas-mess-complaints
npm install
```

### 3. Configure Local Environment
Create `.env.local`:
```bash
cp .env.example .env.local
```

Generate a secure 64-character JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Fill in your `.env.local`:
```env
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_generated_64_character_hex_secret
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=YoManas_BurningBeast@HMC2627
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Push Database Schema & Seed Data
```bash
# Push schema migrations to Neon
npm run db:generate
npm run db:migrate

# Seed sample students, admin, and SMC rep
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the complaint form.

---

## 🧪 Testing & Quality Assurance (18 Suites)

The project includes **18 automated test suites** with over **250 assertions** verifying every critical layer:

```bash
# Run all automated tests
npm test

# Run TypeScript compiler check
npm run typecheck

# Validate production build bundle
npm run build
```

### Test Suite Directory
| Test File | Verification Domain |
|---|---|
| [`tests/date-utils.test.ts`](tests/date-utils.test.ts) | Asia/Kolkata timezone math, 1 July academic year cutoff, and day bounds. |
| [`tests/auth.test.ts`](tests/auth.test.ts) | Jose JWT token generation, verification, and cookie parsing. |
| [`tests/boarder-auth.test.ts`](tests/boarder-auth.test.ts) | Boarder login validation, active student verification, and lockout handling. |
| [`tests/complaint-limits.test.ts`](tests/complaint-limits.test.ts) | Per-meal (3), per-day (6), and per-IP (40) rate limit rules. |
| [`tests/gala.test.ts`](tests/gala.test.ts) | Dynamic Gala Dinner date matching and meal substitution. |
| [`tests/complaint-submission.test.ts`](tests/complaint-submission.test.ts) | Zod schema validation, honeypot detection, and 24h content deduplication. |
| [`tests/smc-auth.test.ts`](tests/smc-auth.test.ts) | SMC authentication, bcrypt verification, and session cookies. |
| [`tests/complaints-query.test.ts`](tests/complaints-query.test.ts) | Active feed query generation, pagination, and meal filtering. |
| [`tests/archive-query.test.ts`](tests/archive-query.test.ts) | Query-time monthly archival rollover boundary logic. |
| [`tests/export.test.ts`](tests/export.test.ts) | SheetJS Excel and PDFKit document generation. |
| [`tests/admin-auth.test.ts`](tests/admin-auth.test.ts) | Super admin auto-bootstrap, secondary admin creation (cap of 3), and audit logging. |
| [`tests/roster-parser.test.ts`](tests/roster-parser.test.ts) | CSV/XLSX parsing, block validation, duplicate roll detection, and delta calculations. |
| [`tests/admin-management.test.ts`](tests/admin-management.test.ts) | SMC user provisioning with one-time passwords and Gala date scheduler. |
| [`tests/moderation-lockouts.test.ts`](tests/moderation-lockouts.test.ts) | Complaint soft-deletion with mandatory justification, restoration, and lockout clearing. |
| [`tests/qr-generator.test.ts`](tests/qr-generator.test.ts) | Pure SVG vector QR code generation. |
| [`tests/admin-export.test.ts`](tests/admin-export.test.ts) | Full system backup endpoints (complaints, roster, audit, logs) in XLSX and PDF. |
| [`tests/security-hardening.test.ts`](tests/security-hardening.test.ts) | Security headers (HSTS, strict CSP), edge route defense, CSRF origin checks, and race conditions. |
| [`tests/acceptance-criteria.test.ts`](tests/acceptance-criteria.test.ts) | End-to-end verification of all 12 SPEC Success Criteria. |

---

## 🚀 Production Deployment Runbook

Deploying to production requires zero paid services:

### Step 1: Create Neon Database
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **Pooled connection string** (ends with `-pooler...` and `?sslmode=require`).
3. Run `npm run db:migrate` locally with this string to create all 9 tables.

### Step 2: Deploy to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Configure the 7 environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SUPER_ADMIN_USERNAME`
   - `SUPER_ADMIN_PASSWORD`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NODE_ENV=production`
3. Click **Deploy**.

### Step 3: First-Run Production Verification
1. Navigate to `https://<your-project>.vercel.app/admin/login`.
2. Sign in with `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` to trigger first-run Super Admin account initialization.
3. Upload your official hostel student roster at `/admin/roster`.
4. Provision SMC committee accounts at `/admin/smc`.
5. Print out the dining table QR standees at `/admin/qr` and place them on mess tables.

For full disaster recovery, rolling update, and operational procedures, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 👨‍💻 Credits & License

- **Lead Developer**: Aditya Prabhakar (Welfare Secretary, Manas Hostel, IIT Guwahati)
- **Institution**: Manas Hostel, Indian Institute of Technology Guwahati
- **License**: [MIT License](LICENSE) — free for educational and non-commercial institutional use.
