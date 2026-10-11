# SPEC.md — Project Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

## Vision
A fast, minimal, pixel-themed web portal for boarders of Manas Hostel to submit mess food complaints directly to the Services Managing Committee (SMC). The portal eliminates friction (accessed instantly via dining table QR codes), resists griefing and spam, ensures strict data integrity with zero client bloat, and provides SMC members and administrators with streamlined oversight, archival, and reporting tools.

## Goals
1. **Boarder Experience**: Provide an ultra-lightweight (<50 KB transfer, Lighthouse 95+), zero/near-zero client JS, mobile-first portal with a retro black-and-white pixel aesthetic where verified boarders submit meal complaints in seconds.
2. **Anti-Griefing & Abuse Resistance**: Protect against unauthorized, automated, or spam submissions through active roster credential checks (Block + Room + Roll Number), honeypot fields, rate limits (3/meal/day, 6/day per student, 40/day per IP), duplicate 24h submission detection, and lockout mechanisms.
3. **SMC Triage & Archival**: Deliver a clean, Reddit-comment-styled feed for SMC members to inspect complaints in real time, filter by meal, automatically roll complaints over to monthly archives after the 7th of the following month, and export filtered data to Excel (.xlsx) and PDF.
4. **Administrative Governance**: Enable hostel administrators to upload/preview/commit student rosters via CSV/XLSX, manage SMC accounts, schedule Gala Dinner dates (which dynamically replace Dinner), review logs, clear lockouts, soft-delete spam complaints, and generate table QR codes.

## Non-Goals (Out of Scope)
- **Interactive Discussion**: No upvoting, downvoting, threaded replies, or reactions on complaints.
- **Student Self-Registration**: Students cannot register themselves; membership is strictly controlled by admin roster uploads.
- **External Notifications & Messaging**: No emails, SMS, push notifications, or external webhook integrations.
- **Media Uploads**: No image, audio, or video attachments on complaints.
- **Third-Party Analytics & Tracking**: Zero external telemetry, Google Analytics, or third-party trackers.
- **Paid Infrastructure**: No paid cloud infrastructure or Redis; all state, rate limits, and counters reside in free serverless Postgres.

## Users & Roles
- **Boarders**: Hostel residents scanning table QR codes. Authenticate using Block (A, B, C, D), Room Number, and Roll Number against the active roster. Session cookie valid for 14 days without sliding expiry.
- **SMC Members**: Student representatives reviewing complaints. Authenticate with Roll Number and password. Session cookie valid for 7 days. Can browse active feeds, historical archives, and trigger PDF/Excel exports.
- **Admins**: Hostel management and developers. Super admin seeded via environment variables; can provision up to 2 additional admins. Full administrative control over rosters, SMC accounts, Gala dates, audit logs, and system data exports.

## Technical Architecture & Constraints
- **Framework**: Next.js (App Router, TypeScript) deployed on Vercel Hobby tier.
- **Database**: Free serverless Postgres (Neon via Vercel Marketplace) using Drizzle ORM.
- **Auth & Sessions**: Signed, HttpOnly, Secure, `SameSite=Lax` cookies using `jose` JWTs. Passwords hashed with `argon2` or `bcrypt`.
- **Timezone & Formatting**: Strictly `Asia/Kolkata` (IST). Date format: `"DD MMM YYYY, hh:mm A"` (e.g., `"11 Oct 2026, 08:15 PM"`).
- **Styling**: Single small custom stylesheet. Strict 1-bit pixel aesthetic: pure `#000000`, `#ffffff`, and at most one neutral grey (`#767676`) for disabled states; hard 2px borders; 0px border-radius; hard-offset box shadows (e.g., `3px 3px 0px #000`); no gradients; no emojis, SVGs, or decoration on boarder routes.
- **Typography**: Self-hosted subsetted pixel font (VT323 `.woff2` < 20 KB, `font-display: swap`) with monospace fallback (`Courier New`, monospace). No external Google Fonts requests.
- **Performance**: Boarder routes ship zero or near-zero JS (tiny ~200-byte inline script solely for the live 10–2000 character counter). Page transfer under 50 KB. Mobile-first single-column layout, no horizontal scroll at 320px, minimum tap target 44px.
- **Exporting**: In-process lightweight serverless export utilities: `xlsx` for Excel and `pdfkit` for PDF (avoiding heavy Chromium/Puppeteer dependencies).

## System Specifications & Business Rules

### 1. Boarder Flow & Complaint Rules
- **Routes**: `/` (redirects to `/login` if unauthenticated, else complaint form), `/login`, `/done`.
- **Login Validation**: Requires Block (A, B, C, D), Room Number, Roll Number. Roll number normalized to uppercase trimmed. Exact match against an active roster row required.
- **Lockout Mechanism**: 5 failed login attempts per roll number or per IP within a 15-minute rolling window triggers a 15-minute lockout. Error messages are generic and show the remaining lockout time without revealing which field was incorrect.
- **Complaint Form**:
  - Displays read-only banner: Boarder Name and Block-Room.
  - Meal selection radio buttons: Breakfast, Lunch, Dinner, Gala Dinner.
  - **Gala Dinner Rule**: Gala Dinner is disabled and hidden unless the current IST date matches an admin-configured Gala Dinner date. When enabled, Gala Dinner replaces Dinner (Dinner becomes disabled and hidden). Server action enforces this strictly.
  - Textarea: Min 10, max 2000 characters with live character counter.
  - Anti-Spam: Hidden honeypot field; server rejects empty/whitespace text and identical text submitted by the same student within 24 hours.
  - Anti-Grief Limits: Maximum 3 complaints per meal per IST day, and maximum 6 complaints total per IST day per student. IP limits backstop at 40/day. Gala Dinner counts as the Dinner slot.
  - Post-submit: Redirects to `/done` with confirmation and link back to form. Logout action clears session cookie.

### 2. Roster & Dynamic Year of Study
- **Columns**: `name`, `block`, `room_number`, `roll_number`, `course`, `year_of_joining`, `is_active`.
- **Dynamic Year Calculation**: Computed at read-time with an academic year cutoff on 1 July.
  $$\text{academicStart} = \begin{cases} \text{currentYear} & \text{if month} \ge 7 \\ \text{currentYear} - 1 & \text{otherwise} \end{cases}$$
  $$\text{yearOfStudy} = \text{academicStart} - \text{yearOfJoining} + 1$$
- Display ordinals: `"1st Year"`, `"2nd Year"`, `"3rd Year"`, `"4th Year"`, `"5th Year"`. If $<1$ or $>6$, display `"Check roster"` and flag in admin view.
- **Snapshot Integrity**: Each complaint stores a snapshot of `name`, `course`, `year_of_study_label`, and `block_room` at submission time so historical data is immutable.

### 3. SMC Portal
- **Routes**: `/smc` (login), `/smc/forgot` (static text: "Contact Developer - Aditya Prabhakar, Welfare Secretary, Manas Hostel"), `/smc/complaints` (feed), `/smc/archive`.
- **Feed UI**: Styled like a retro Reddit comment card stream. No voting, threading, or replies. Header: `Name | Course | Year of Study | Block-Room | Meal | Timestamp`.
- **Active vs. Archive Rollover**: A complaint from month $M$ stays in `/smc/complaints` until the end of the 7th day of month $M+1$ (23:59:59 IST), then automatically displays under `/smc/archive`. Computed at query time (no background cron needed).
- **Archival Organization**: `/smc/archive` groups by `"Month Year"` (e.g., `"September 2026"`), newest first.
- **Filtering & Pagination**: Meal filter (`All`, `Breakfast`, `Lunch`, `Dinner`, `Gala Dinner`) via query parameters. 25 complaints per page.
- **Exports**: Download Excel (.xlsx) and PDF for the current feed and any archive month, respecting the active meal filter.

### 4. Admin Administration
- **Routes**: `/admin/login`, `/admin` (dashboard), `/admin/roster`, `/admin/smc`, `/admin/gala`, `/admin/complaints`, `/admin/logs`, `/admin/export`, `/admin/qr`.
- **Admin Hierarchy**: One super admin seeded from environment variables (`SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`). Super admin can create up to 2 additional admins, deactivate them, or reset passwords.
- **Roster Management**: Upload CSV or XLSX with preview and validation (required columns, roll number duplicates, valid blocks A-D). Bulk upsert on confirmation. Missing students in new upload marked `is_active = false` (preserving historical complaints). Edit individual roster records.
- **SMC Management**: Provision SMC members (roll number + generated password displayed once), reset passwords, deactivate.
- **Gala Dinner Management**: Date picker / date list to add or remove special Gala Dinner dates.
- **Moderation**: View all complaints, filter, and soft-delete abusive/spam items with an audit entry.
- **Logs & Lockouts**: Review login and submission logs; inspect active IP and roll number lockouts with one-click clear button.
- **QR Generator**: Generates and renders a clean, printable SVG QR code encoding the site URL.
- **Audit Log**: Immutable table tracking all admin modifications (timestamp, admin username, action, metadata).

## Success Criteria
- [ ] Boarder login verifies Block, Room, and Roll Number and issues a 14-day signed HttpOnly cookie.
- [ ] 5 failed logins within 15 minutes trigger a 15-minute lockout with user-friendly countdown message.
- [ ] Per-student limits enforce max 3 complaints per meal per day and max 6 per day (IST).
- [ ] Honeypot and 24-hour duplicate text detection successfully block spam submissions.
- [ ] Gala Dinner dynamically unlocks only on configured dates, replacing Dinner in both UI and backend validation.
- [ ] Dynamic Year of Study accurately renders ordinals ("3rd Year" for 2024 joining in Oct 2026) and flags out-of-range values.
- [ ] Complaint snapshots preserve boarder metadata across roster updates.
- [ ] SMC complaints feed rolls over to archive on the 8th day of the subsequent month at 00:00 IST without cron jobs.
- [ ] Filtered Excel (.xlsx) and PDF exports execute reliably on serverless endpoints.
- [ ] Boarder pages achieve <50 KB transfer, zero non-essential JS, and 95+ mobile Lighthouse score with strict 1-bit pixel aesthetic.
- [ ] Admin dashboard supports roster CSV/XLSX preview/commit, SMC provisioning, audit logs, and printable SVG QR code.

---

*Last updated: 2026-10-11*
