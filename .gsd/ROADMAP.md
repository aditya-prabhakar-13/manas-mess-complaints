---
milestone: v1.0
version: 1.0.0
updated: 2026-10-11T12:00:00+05:30
---

# Roadmap

> **Current Phase:** Phase 1: Foundation, Database Architecture & Design System
> **Status:** ⬜ Not Started

## Must-Haves (from SPEC)

- [ ] Fast, minimal boarder complaint portal with 1-bit pixel aesthetic and near-zero client JS (<50 KB, Lighthouse 95+)
- [ ] Strict student roster authentication (Block A-D, Room, Roll) with 14-day session cookies and 15-minute lockouts on 5 failed attempts
- [ ] Anti-grief rate limits (max 3/meal/day, max 6/day per student, 40/day per IP), honeypot anti-spam, and 24h duplicate submission rejection
- [ ] Gala Dinner dynamic unlock and Dinner replacement based on admin-scheduled dates (enforced in UI & server)
- [ ] Dynamic Year of Study calculation (1 July cutoff, "1st Year" - "5th Year") and immutable complaint snapshots
- [ ] SMC Reddit-styled comment card feed, 25/page, meal filters, query-time 7-day post-month-end archive rollover, and XLSX/PDF export
- [ ] Admin management: CSV/XLSX roster upload with preview & validation, SMC provisioning, Gala dates, moderation, logs, lockouts, and printable SVG QR code

---

## Phases

### Phase 1: Foundation, Database Architecture & Design System
**Status:** ⬜ Not Started
**Objective:** Establish the Next.js TypeScript project, serverless Postgres schema via Drizzle ORM, IST date utilities, JWT auth helpers, the strict 1-bit pixel CSS design system with self-hosted VT323 font, and the boarder authentication flow with lockout enforcement.
**Requirements:** REQ-01, REQ-02, REQ-03, REQ-11, NFR-01, NFR-02, NFR-04, NFR-05, NFR-06, CON-01, CON-02

**Plans:**
- [ ] Plan 1.1: Project initialization, Drizzle ORM schema, Neon connection pool, environment configuration, and seed scripts.
- [ ] Plan 1.2: IST timezone calculation engine (Year of Study, time formatting, calendar date bounds) and Jose JWT session handlers.
- [ ] Plan 1.3: 1-Bit Pixel design system (pure #000/#fff/#767676, hard 2px borders, 0 radius, VT323 font, responsive mobile layout).
- [ ] Plan 1.4: Boarder login flow (`/login`), credential verification against active roster, 15-minute lockout enforcement, and session cookie issuance.

---

### Phase 2: Boarder Complaint Flow & Anti-Abuse Engine
**Status:** ⬜ Not Started
**Objective:** Deliver the public boarder experience: authenticated complaint form at `/`, Gala Dinner dynamic scheduling, live character counter, comprehensive anti-griefing limits, snapshot storage, and confirmation flow.
**Requirements:** REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-12, NFR-03, CON-03
**Depends on:** Phase 1

**Plans:**
- [ ] Plan 2.1: Complaint form UI with read-only boarder header, meal radio buttons, Gala date dynamic replacement, and <200-byte live character counter.
- [ ] Plan 2.2: Server action submission pipeline: honeypot check, 24h duplicate check, per-meal and per-day rate limit validator, and complaint snapshot persistence.
- [ ] Plan 2.3: Submission confirmation `/done`, logout handler, and performance profiling (<50 KB transfer, Lighthouse 95+).

---

### Phase 3: SMC Portal, Reddit-Style Feed & Archival Exports
**Status:** ⬜ Not Started
**Objective:** Build the SMC review portal with comment card feed UI, query-time archival rollover, and serverless PDF/Excel export endpoints.
**Requirements:** REQ-13, REQ-14, REQ-15, REQ-16, REQ-17
**Depends on:** Phase 2

**Plans:**
- [ ] Plan 3.1: SMC authentication (`/smc`, 7-day session) and static `/smc/forgot` contact page.
- [ ] Plan 3.2: SMC active feed (`/smc/complaints`) with Reddit comment cards, meal query filters, and 25/page pagination.
- [ ] Plan 3.3: Query-time monthly archive rollover logic and `/smc/archive` view grouped by Month-Year.
- [ ] Plan 3.4: Serverless Excel (.xlsx via SheetJS/ExcelJS) and PDF (.pdf via PDFKit) export route handlers respecting meal filters.

---

### Phase 4: Admin Governance, Moderation & Audit Tools
**Status:** ⬜ Not Started
**Objective:** Implement comprehensive administrative features: super admin seeding, roster CSV/XLSX bulk upload with validation and preview, SMC account provisioning, Gala date scheduling, complaint moderation, security logs, and printable SVG QR code.
**Requirements:** REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24, REQ-25
**Depends on:** Phase 3

**Plans:**
- [ ] Plan 4.1: Admin auth (`/admin/login`, super admin seeding from env, secondary admin creation) and audit trail infrastructure.
- [ ] Plan 4.2: Roster management: CSV/XLSX file parser, preview modal/table, validation, atomic upsert, inactive marking, and inline edits.
- [ ] Plan 4.3: SMC user management (create with one-time password view, reset, deactivate) and Gala Dinner date scheduler.
- [ ] Plan 4.4: Complaints moderation (filter, search, soft-delete with audit entry) and security logs & lockout inspector (clear lockouts).
- [ ] Plan 4.5: Full system data export and printable table QR code generator (`/admin/qr`).

---

### Phase 5: Production Hardening, Verification & Deployment Readiness
**Status:** ⬜ Not Started
**Objective:** Execute security auditing (CSP, CSRF, origin checks), automated test suite for edge cases, performance benchmarks, and Vercel/Neon deployment documentation.
**Requirements:** NFR-06, All Acceptance Criteria
**Depends on:** Phase 4

**Plans:**
- [ ] Plan 5.1: Security hardening (middleware route protection, CSP headers, rate-limit stress tests).
- [ ] Plan 5.2: Verification of all 8 acceptance criteria with reproducible tests/scripts.
- [ ] Plan 5.3: Deployment guide and environment validation (`.env.example`).

---

## Progress Summary

| Phase | Status | Plans | Complete |
|-------|--------|-------|----------|
| 1 | ⬜ | 0/4 | — |
| 2 | ⬜ | 0/3 | — |
| 3 | ⬜ | 0/4 | — |
| 4 | ⬜ | 0/5 | — |
| 5 | ⬜ | 0/3 | — |

---

## Timeline

| Phase | Started | Completed | Duration |
|-------|---------|-----------|----------|
| 1 | — | — | — |
| 2 | — | — | — |
| 3 | — | — | — |
| 4 | — | — | — |
| 5 | — | — | — |
