---
milestone: v1.0
updated: 2026-10-11T12:00:00+05:30
---

# Requirements

## Overview
Functional, non-functional requirements and constraints derived from SPEC.md for the Manas Hostel Mess Complaint Portal.

---

## Functional Requirements

| ID | Requirement | Source | Phase | Status |
|----|-------------|--------|-------|--------|
| REQ-01 | Boarder login with Block (A-D), Room Number, Roll Number against active roster | SPEC Goal 1 | 1 | Pending |
| REQ-02 | Boarder session issuing 14-day signed HttpOnly `SameSite=Lax` cookie without sliding | SPEC Goal 1 | 1 | Pending |
| REQ-03 | Boarder lockout on 5 failed attempts per roll or IP within 15 min (locks for 15 min, shows generic error with unlock time) | SPEC Goal 2 | 1 | Pending |
| REQ-04 | Complaint form showing student name and block-room as read-only header | SPEC Goal 1 | 2 | Pending |
| REQ-05 | Live character counter (min 10, max 2000 chars) via tiny inline vanilla script (<200 bytes) | SPEC Goal 1 | 2 | Pending |
| REQ-06 | Meal selection radio options (Breakfast, Lunch, Dinner, Gala Dinner) | SPEC Goal 1 | 2 | Pending |
| REQ-07 | Gala Dinner dynamic rule: enabled only on admin-configured Gala dates, replaces Dinner in UI and server validation | SPEC Goal 2 | 2 | Pending |
| REQ-08 | Complaint submission anti-spam: honeypot field, 24h duplicate content rejection, empty/whitespace rejection | SPEC Goal 2 | 2 | Pending |
| REQ-09 | Anti-grief rate limits: max 3/meal/day, max 6/day per student, 40/day per IP; clear message with reset time | SPEC Goal 2 | 2 | Pending |
| REQ-10 | Post-submit redirect to `/done` with confirmation and link back to form, plus logout capability | SPEC Goal 1 | 2 | Pending |
| REQ-11 | Dynamic Year of Study calculation based on 1 July cutoff (ordinals 1st-5th, 'Check roster' if <1 or >6) | SPEC Goal 3 | 1 | Pending |
| REQ-12 | Immutable snapshot storage of student metadata (name, course, year label, block-room) upon complaint creation | SPEC Goal 3 | 2 | Pending |
| REQ-13 | SMC authentication (Roll + password, 7-day session) and static `/smc/forgot` contact page | SPEC Goal 3 | 3 | Pending |
| REQ-14 | SMC comment card feed UI (Reddit-styled comment cards, no voting/replies/threading, 25/page, newest first, meal query filters) | SPEC Goal 3 | 3 | Pending |
| REQ-15 | Query-time complaint archival rollover: complaints from month M move to archive after 7th day of M+1 23:59 IST | SPEC Goal 3 | 3 | Pending |
| REQ-16 | SMC archive view grouped by Month Year (e.g., 'September 2026') with meal filtering | SPEC Goal 3 | 3 | Pending |
| REQ-17 | SMC export functionality: Download Excel (.xlsx) and PDF respecting active meal filters | SPEC Goal 3 | 3 | Pending |
| REQ-18 | Admin authentication with seeded super admin from env, support for up to 2 additional admins | SPEC Goal 4 | 4 | Pending |
| REQ-19 | Admin roster CSV/XLSX upload with preview & validation, upsert, marking missing students inactive, and inline edits | SPEC Goal 4 | 4 | Pending |
| REQ-20 | Admin SMC account provisioning (roll + generated password shown once), reset, and deactivation | SPEC Goal 4 | 4 | Pending |
| REQ-21 | Admin Gala Dinner date management (add/remove dates) | SPEC Goal 4 | 4 | Pending |
| REQ-22 | Admin complaints moderation: view all complaints (active & archived), filter, and soft-delete with audit entry | SPEC Goal 4 | 4 | Pending |
| REQ-23 | Admin security logs & lockout inspector: view login/submission logs and clear active lockouts | SPEC Goal 4 | 4 | Pending |
| REQ-24 | Admin full data export (complaints, roster, logs as XLSX/PDF) and printable SVG QR code generator | SPEC Goal 4 | 4 | Pending |
| REQ-25 | Immutable admin audit trail logging all administrative actions | SPEC Goal 4 | 4 | Pending |

---

## Non-Functional Requirements

| ID | Requirement | Category | Phase | Status |
|----|-------------|----------|-------|--------|
| NFR-01 | Strict 1-bit pixel aesthetic: pure `#000` / `#fff`, 2px borders, 0 radius, pixel offset shadows, no emojis/SVGs on boarder routes | UX / Design | 1 | Pending |
| NFR-02 | Self-hosted subsetted VT323 font (<20 KB woff2) with monospace fallback, zero Google Fonts requests | Performance | 1 | Pending |
| NFR-03 | Boarder routes performance: <50 KB total transferred, 95+ mobile Lighthouse score, near-zero client JS | Performance | 2 | Pending |
| NFR-04 | Mobile responsiveness: single-column layout, minimum 44px tap targets, zero horizontal scroll at 320px | UX | 1 | Pending |
| NFR-05 | Strict Asia/Kolkata timezone handling for date bounds, display formatting ("11 Oct 2026, 08:15 PM"), and rollovers | Reliability | 1 | Pending |
| NFR-06 | Security headers (CSP, X-Frame-Options, Referrer-Policy), CSRF protection, and Zod input validation | Security | 1 | Pending |

---

## Constraints

| ID | Constraint | Source | Impact |
|----|------------|--------|--------|
| CON-01 | Vercel Free (Hobby) tier runtime constraints | SPEC | Pure JS serverless libraries for PDF/Excel (no headless Chromium) |
| CON-02 | Serverless Postgres (Neon) with zero Redis | SPEC | All rate limits, lockouts, and counters stored in Postgres tables |
| CON-03 | Zero client-side JS framework dependencies on boarder pages | SPEC | Plain HTML forms with server action handlers and progressive enhancement |

---

## Status Definitions
- **Pending**: Not yet started
- **In Progress**: Being implemented
- **Complete**: Implemented and verified
- **Blocked**: Cannot proceed
