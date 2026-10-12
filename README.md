# Manas Hostel Mess Complaint Portal

> **Fast, zero-cost, 1-bit retro mess complaint management portal engineered for Manas Hostel, IIT Guwahati.**  
> Designed for table-side QR code scanning by boarders, review by the Services Managing Committee (SMC), and full administrative governance by Hostel Management.

---

## 📑 Table of Contents

- [Overview & Philosophy](#overview--philosophy)
- [System Architecture](#system-architecture)
- [Design System & Performance Budget](#design-system--performance-budget)
- [Complete Route Directory](#complete-route-directory)
- [Database Schema (9 Tables)](#database-schema-9-tables)
- [Key Features & Business Logic](#key-features--business-logic)
  - [1. Authentication & Session Isolation](#1-authentication--session-isolation)
  - [2. Anti-Abuse & Rate Limiting Engine](#2-anti-abuse--rate-limiting-engine)
  - [3. Dynamic Academic Year of Study](#3-dynamic-academic-year-of-study)
  - [4. Gala Dinner Dynamic Replacement](#4-gala-dinner-dynamic-replacement)
  - [5. Query-Time Archival Rollover](#5-query-time-archival-rollover)
  - [6. Pure JS Serverless Document Exports](#6-pure-js-serverless-document-exports)
  - [7. Vector SVG Table QR Code Generator](#7-vector-svg-table-qr-code-generator)
  - [8. Immutable Audit Trail](#8-immutable-audit-trail)
- [Local Setup & Development](#local-setup--development)
- [Test Suite & Verification](#test-suite--verification)
- [Production Deployment Runbook](#production-deployment-runbook)
- [Credits & Maintenance](#credits--maintenance)

---

## 🎯 Overview & Philosophy

The **Manas Hostel Mess Complaint Portal** provides an ultra-low-friction feedback channel for students eating in the dining hall. When boarders encounter food quality, cleanliness, or catering issues, they scan a QR code standee on their dining table and submit authenticated complaints in seconds.

### Core Tenets:
1. **Zero Recurring Infrastructure Cost**: Runs completely on the free tiers of **Vercel** (Hobby) and **Neon Serverless Postgres** without requiring paid services, Redis instances, or external workers.
2. **Strict 1-Bit Pixel Terminal Aesthetic**: Distinctive visual design adhering to pure `#000000`, `#ffffff`, `#767676` (muted/disabled only), hard 2px borders, `0px` border-radius, and crisp typography powered by a self-hosted subset of the **VT323** font.
3. **Extreme Client-Side Performance**: Near-zero client JavaScript footprint on boarder routes. Total initial transfer payload is strictly **< 50 KB**, achieving instant page loads and Lighthouse scores of 95+ even on throttled 2G/3G campus connections.
4. **Data Integrity & Immutability**: All complaints store an immutable snapshot of student details (name, course, academic year, block-room) at submission time so historical records remain tamper-proof even when residents change rooms or update roster records.

---

## 🏗️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Dining Table QR        │
                                  │   (Scan via Phone Camera)   │
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
└───────────────────────────────┴─────────────┬─────────────┴─────────────────────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │                       │                       │
                      ▼                       ▼                       ▼
          ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
          │  Jose Signed JWTs    │ │ Serverless Exporters │ │ Asia/Kolkata Clock   │
          │  (HttpOnly Cookies)  │ │ (SheetJS + PDFKit)   │ │ (IST Bound Engine)   │
          └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                                              │
                                              ▼
          ┌───────────────────────────────────────────────────────────────────────┐
          │                  Neon Serverless PostgreSQL (Drizzle ORM)             │
          │     All State, Lockouts, Counters, and Rate Limits in Postgres        │
          └───────────────────────────────────────────────────────────────────────┘
```

### Technology Stack:
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components, Server Actions)
- **UI & Runtime**: [React 19](https://react.dev/), TypeScript 5
- **Database**: [Neon](https://neon.tech/) Serverless PostgreSQL (Connection Pooling over HTTP)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- **Authentication**: Signed Jose JWTs stored in isolated `HttpOnly`, `SameSite=Lax` cookies
- **Styling**: Vanilla CSS design system (`src/app/globals.css`) with 1-bit CSS custom tokens
- **Typography**: Self-hosted subsetted `VT323.woff2` (17.5 KB, zero Google Fonts requests)
- **Document Generation**: Pure JS in-process streaming via [SheetJS](https://sheetjs.com/) (`xlsx`) and [PDFKit](https://pdfkit.org/) (`pdfkit`)
- **QR Code Engine**: Pure vector SVG rendering via [node-qrcode](https://github.com/soldair/node-qrcode)

---

## 🎨 Design System & Performance Budget

| Attribute | Specification | Implementation |
|---|---|---|
| **Palette** | Strict 1-Bit Monochrome | `--bg: #ffffff`, `--fg: #000000`, `--disabled: #767676` |
| **Borders** | Hard geometric borders | `border: 2px solid #000000`, `border-radius: 0px !important` |
| **Shadows** | High-contrast pixel offset | `box-shadow: 3px 3px 0px #000000` |
| **Font** | Self-hosted VT323 | `public/fonts/vt323.woff2` (17.52 KB, under 20 KB budget) |
| **Boarder Payload** | Critical assets < 50 KB | Font + CSS + Form + HTML = **38.12 KB** total transfer |
| **Lighthouse** | Mobile score 95+ | Zero render-blocking scripts, zero analytics, zero external CDNs |

---

## 🗺️ Complete Route Directory

The portal is strictly partitioned into three isolated user planes and two streaming export APIs:

### 1. Boarder Routes (Students)
| Path | Type | Purpose | Access |
|---|---|---|---|
| `/login` | Public | Boarder login by Block (A-D), Room Number, and Roll Number against active roster. | Public (redirects to `/` if logged in) |
| `/` | Protected | Dining complaint submission form with read-only student header, dynamic meal radio options, live character counter (10–2000 chars), and logout action. | Boarder Session Cookie |
| `/done` | Protected | Post-submission receipt confirmation with quick link to submit another complaint or log out. | Boarder Session Cookie |

### 2. SMC Routes (Services Managing Committee)
| Path | Type | Purpose | Access |
|---|---|---|---|
| `/smc` | Public | SMC representative login (Hostel Roll Number + Password). | Public (redirects to feed if logged in) |
| `/smc/complaints` | Protected | Real-time Reddit-style comment card complaint stream. Supports meal filtering and 25-item pagination. | SMC or Admin Session |
| `/smc/archive` | Protected | Historical complaint archive grouped chronologically by Month-Year (e.g. *"September 2026"*). | SMC or Admin Session |
| `/smc/forgot` | Public | Static developer support contact page for forgotten credentials. | Public |

### 3. Administration Routes (Hostel Authority)
| Path | Type | Purpose | Access |
|---|---|---|---|
| `/admin/login` | Public | Super admin and secondary admin sign-in portal. | Public (redirects to `/admin` if logged in) |
| `/admin` | Protected | Central administration overview with system statistics, quick navigation, and secondary admin account creation (capped at 3 total admins). | Admin Session |
| `/admin/roster` | Protected | Bulk student roster management: CSV/XLSX file upload with validation preview, delta calculation (`toInsert`, `toUpdate`, `toDeactivate`), atomic commit, and inline student record editing. | Admin Session |
| `/admin/smc` | Protected | SMC account provisioning: register representatives, display one-time 10-character passwords, trigger password resets, or toggle active/inactive statuses. | Admin Session |
| `/admin/gala` | Protected | Gala Dinner date scheduler: register or delete special festival dates (`YYYY-MM-DD`). | Admin Session |
| `/admin/complaints` | Protected | Moderation console: view all complaints (active, archived, or soft-deleted), with mandatory justification soft-deletion and instant restoration. | Admin Session |
| `/admin/logs` | Protected | Security inspector: browse authentication attempts, rate-limit hits, and inspect/clear active IP or roll number lockouts with one click. | Admin Session |
| `/admin/export` | Protected | Comprehensive data backup center: download complaints, roster, audit trail, and security logs in XLSX and PDF formats. | Admin Session |
| `/admin/qr` | Protected | Dining table QR standee generator: customized printable A4 card with centered SVG vector QR code and `@media print` layout. | Admin Session |

### 4. Streaming Export API Routes
| Path | Method | Purpose | Authentication |
|---|---|---|---|
| `/api/export/complaints` | `GET` | Stream filtered complaints archive as `.xlsx` or `.pdf` (supports `?view=active|archive`, `?meal=all|breakfast|...`, `?month=YYYY-MM`). | SMC or Admin Cookie |
| `/api/admin/export` | `GET` | Stream unpaginated system backups (supports `?type=complaints|roster|audit|logs&format=xlsx|pdf`). | Admin Cookie |

---

## 🗄️ Database Schema (9 Tables)

All schema definitions live in [`src/db/schema.ts`](file:///d:/Manas/SMC_Complaint/src/db/schema.ts).

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    students     │       │   complaints    │       │    smc_users    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──┐   │ id (PK)         │       │ id (PK)         │
│ roll_number(UQ) │   └───│ student_id (FK) │       │ roll_number(UQ) │
│ name            │       │ roll_number     │       │ password_hash   │
│ block (A-D)     │       │ name_snapshot   │       │ name            │
│ room_number     │       │ block_room_snap │       │ is_active       │
│ course          │       │ course_snapshot │       │ created_at      │
│ year_of_joining │       │ year_of_study   │       └─────────────────┘
│ is_active       │       │ meal            │
│ created_at      │       │ complaint_text  │       ┌─────────────────┐
│ updated_at      │       │ is_deleted      │       │     admins      │
└─────────────────┘       │ deleted_by      │       ├─────────────────┤
                          │ deleted_reason  │       │ id (PK)         │
                          │ created_at      │       │ username (UQ)   │
                          └─────────────────┘       │ password_hash   │
                                                    │ is_super_admin  │
┌─────────────────┐       ┌─────────────────┐       │ is_active       │
│   gala_dates    │       │ login_attempts  │       │ created_at      │
├─────────────────┤       ├─────────────────┤       └─────────────────┘
│ id (PK)         │       │ id (PK)         │
│ gala_date (UQ)  │       │ identifier      │       ┌─────────────────┐
│ description     │       │ ip_address      │       │    audit_log    │
│ created_at      │       │ outcome         │       ├─────────────────┤
└─────────────────┘       │ user_type       │       │ id (PK)         │
                          │ attempted_at    │       │ actor_type      │
┌─────────────────┐       └─────────────────┘       │ actor_id        │
│    lockouts     │                                 │ action          │
├─────────────────┤       ┌─────────────────┐       │ target_type     │
│ id (PK)         │       │ submission_log  │       │ target_id       │
│ key_type        │       ├─────────────────┤       │ details         │
│ key_value       │       │ id (PK)         │       │ created_at      │
│ locked_until    │       │ roll_number     │       └─────────────────┘
│ reason          │       │ ip_address      │
│ created_at      │       │ meal / outcome  │
└─────────────────┘       │ attempted_at    │
                          └─────────────────┘
```

---

## ⚡ Key Features & Business Logic

### 1. Authentication & Session Isolation
- Three distinct session cookies:
  - `manas_boarder_session`: 14 days (signed Jose JWT).
  - `manas_smc_session`: 7 days (signed Jose JWT).
  - `manas_admin_session`: 24 hours (signed Jose JWT).
- All cookies are tagged `HttpOnly`, `Secure` (in production), and `SameSite=Lax`.
- **Zero Sliding Expirations**: Session tokens do not automatically slide, eliminating session hijacking risks.

### 2. Anti-Abuse & Rate Limiting Engine
No Redis required — all rate limiting and locking logic runs directly against indexed Postgres tables:
- **Per-Meal Limit**: Maximum **3 complaints** per meal per IST day per student.
- **Per-Day Student Limit**: Maximum **6 complaints** total across all meals per IST day per student.
- **Per-Day IP Limit**: Maximum **40 submissions** per day from any single client IP address.
- **Progressive Failure Lockout**: **5 failed login attempts** within 15 minutes trigger an automatic **15-minute lockout** for that roll number or IP address.
- **Spam Defenses**:
  - Transparent honeypot field (`website_hp`) silently traps automated bots.
  - 24-hour duplicate content detector blocks identical submissions from the same student.

### 3. Dynamic Academic Year of Study
Year of study is calculated dynamically at runtime using an academic year boundary of **1 July**:
$$\text{academicStart} = \begin{cases} \text{currentYear} & \text{if IST month} \ge 7 \\ \text{currentYear} - 1 & \text{otherwise} \end{cases}$$
$$\text{yearOfStudy} = \text{academicStart} - \text{yearOfJoining} + 1$$
- Formatted as ordinals: `"1st Year"`, `"2nd Year"`, `"3rd Year"`, `"4th Year"`, `"5th Year"`.
- If $< 1$ or $> 6$, it automatically flags as `"Check roster"`.

### 4. Gala Dinner Dynamic Replacement
- Administrators schedule special Gala dates (`YYYY-MM-DD`) via `/admin/gala`.
- On active Gala dates, the portal automatically replaces the standard `"Dinner"` option with `"Gala Dinner"` in the UI and backend validation.
- Submissions for Gala Dinner count against the dinner rate-limiting slot.

### 5. Query-Time Archival Rollover
- **Zero Background Cron Jobs**: Archival is evaluated dynamically at query time (`getActiveFeedCutoffDate()`).
- Complaints from month $M$ remain in the active review feed (`/smc/complaints`) until **the 7th day of month $M+1$ at 23:59:59 IST**.
- At **00:00:00 IST on the 8th day**, records automatically roll into `/smc/archive` under their corresponding Month-Year view.

### 6. Pure JS Serverless Document Exports
- Generates binary `.xlsx` spreadsheets via **SheetJS** and `.pdf` documents via **PDFKit**.
- Operates entirely in-process using standard Node stream/buffer transformations without headless browsers or Puppeteer, executing reliably within Vercel's 10-second serverless execution limits.

### 7. Vector SVG Table QR Code Generator
- Generates clean, resolution-independent vector SVG QR codes via `qrcode.toString(url, { type: 'svg' })`.
- Custom printable card layout (`/admin/qr`) includes dining table labels, scan instructions, and `@media print` rules formatted for A4 acrylic standees.

### 8. Immutable Audit Trail
- Every administrative action (`admin_login`, `upload_roster`, `update_student`, `create_smc_user`, `reset_smc_password`, `add_gala_date`, `soft_delete_complaint`, `clear_lockout`) writes an immutable record to `audit_log` with actor username, timestamp, and metadata.

---

## 🛠️ Local Setup & Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/aditya-prabhakar-13/manas-mess-complaints.git
cd manas-mess-complaints
npm install
```

### 2. Configure Environment
Create `.env.local` from the template:
```bash
cp .env.example .env.local
```

Generate a 64-character JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `.env.local`:
```env
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_64_character_hex_secret
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=YourStrongPassword123!
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Initialize Database
```bash
# Push database schema to Neon
npm run db:generate
npm run db:migrate

# (Optional) Seed sample students, admin, and SMC account
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## 🧪 Test Suite & Verification

The codebase includes **18 automated test suites** covering over 250 unit, integration, and security assertions:

```bash
# Run all 18 test suites
npm test

# Run TypeScript type checking
npm run typecheck

# Run production build validation
npm run build
```

### Test Suite Directory:
| Test File | Domain Covered |
|---|---|
| `tests/date-utils.test.ts` | Asia/Kolkata timezone calculations, 1 July academic year cutoff, and day bounds. |
| `tests/auth.test.ts` | Jose JWT token generation, verification, and cookie parsing. |
| `tests/boarder-auth.test.ts` | Boarder login validation, active student verification, and lockout handling. |
| `tests/complaint-limits.test.ts` | Per-meal (3), per-day (6), and per-IP (40) rate limit rules. |
| `tests/gala.test.ts` | Dynamic Gala Dinner date matching and meal substitution. |
| `tests/complaint-submission.test.ts` | Zod schema validation, honeypot detection, and 24h content deduplication. |
| `tests/smc-auth.test.ts` | SMC authentication, bcrypt verification, and session cookies. |
| `tests/complaints-query.test.ts` | Active feed query generation, pagination, and meal filtering. |
| `tests/archive-query.test.ts` | Query-time monthly archival rollover boundary logic. |
| `tests/export.test.ts` | SheetJS Excel and PDFKit document generation. |
| `tests/admin-auth.test.ts` | Super admin auto-bootstrap, secondary admin creation (cap of 3), and audit logging. |
| `tests/roster-parser.test.ts` | CSV/XLSX parsing, block validation, duplicate roll detection, and delta calculations. |
| `tests/admin-management.test.ts` | SMC user provisioning with one-time passwords and Gala date scheduler. |
| `tests/moderation-lockouts.test.ts` | Complaint soft-deletion with mandatory justification, restoration, and lockout clearing. |
| `tests/qr-generator.test.ts` | Pure SVG vector QR code generation. |
| `tests/admin-export.test.ts` | Full system backup endpoints (complaints, roster, audit, logs) in XLSX and PDF. |
| `tests/security-hardening.test.ts` | Security headers (HSTS, strict CSP), edge route defense, CSRF origin checks, and race conditions. |
| `tests/acceptance-criteria.test.ts` | End-to-end verification of all 12 SPEC Success Criteria. |
| `tests/bundle-performance.test.ts` | Self-hosted font size (<20 KB), CSS tokens, and boarder route critical asset transfer (<50 KB). |
| `tests/env-validation.test.ts` | Production environment configuration validator and diagnostics. |

---

## 🚀 Production Deployment Runbook

Deploying to production requires zero paid infrastructure:

### 1. Neon Database Setup
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **Pooled connection string** (including `sslmode=require`).
3. Run `npm run db:migrate` locally to set up all tables.

### 2. Vercel Deployment
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Add the environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SUPER_ADMIN_USERNAME`
   - `SUPER_ADMIN_PASSWORD`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NODE_ENV=production`
3. Click **Deploy**.

For detailed operational procedures, refer to [`DEPLOYMENT.md`](file:///d:/Manas/SMC_Complaint/DEPLOYMENT.md).

---

## 👨‍💻 Credits & Maintenance

- **Developer**: Aditya Prabhakar (Welfare Secretary, Manas Hostel, IIT Guwahati)
- **Institution**: Manas Hostel, Indian Institute of Technology Guwahati
- **License**: MIT
