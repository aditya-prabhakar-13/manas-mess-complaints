---
phase: 0
researched_at: 2026-10-11
discovery_level: 2
---

# Architecture & Technical Research

## Objective
Establish the architectural foundations and technical choices for the Manas Hostel Mess Complaint Portal, specifically validating serverless Postgres (Neon) constraints, Next.js App Router cookie handling, lightweight PDF/Excel exports on Vercel Hobby tier, rate limiting without Redis, and zero-JS client constraints.

## Discovery Level
**Level 2** — Architectural validation of serverless constraints, schema design, and export pipelines.

## Key Decisions

### Decision 1: Session Management & Authentication
**Question:** How should sessions be stored and verified across Boarder (14 days), SMC (7 days), and Admin roles?
**Options Considered:**
1. *NextAuth/Auth.js*: High bundle overhead, multi-provider bloat, difficult to customize for custom student roster verification without self-registration.
2. *Iron-session*: Encrypted sealed cookies, lightweight.
3. *Jose (Signed HttpOnly JWT cookies)*: Standard, stateless, zero database lookup per static asset/middleware route, sub-millisecond verification in Edge/Node runtime, signed with HS256 secret.
**Decision:** **Jose JWTs** stored in HttpOnly, Secure, `SameSite=Lax` cookies. Dedicated token payloads per role (`role: 'boarder' | 'smc' | 'admin'`). 14-day expiry for boarders (non-sliding), 7-day expiry for SMC.
**Confidence:** High

### Decision 2: In-Database Anti-Griefing & Rate Limiting (No Redis)
**Question:** How to implement lockouts (5 failed logins / 15 mins) and rate limits (3/meal/day, 6/day/student, 40/day/IP) without Redis?
**Options Considered:**
1. *In-memory Map*: Fails in serverless environments due to ephemeral lambda lifecycles.
2. *Upstash Redis*: Adds another third-party external service and potential cold-start latency.
3. *Postgres Tables (`login_attempts`, `complaints`, `lockouts`)*: Everything lives in Postgres with indexed timestamps (`created_at`) and simple aggregation queries or atomic upserts. Clean, zero extra dependencies, free tier friendly.
**Decision:** **Postgres-backed rate limiting & attempts tracking**. Indexed queries over `login_attempts` (`roll_number`, `ip_address`, `attempted_at`) and `complaints` (`roll_number`, `created_at`, `meal`) directly evaluate limits during server actions.
**Confidence:** High

### Decision 3: Serverless PDF & Excel Export
**Question:** How to generate PDFs and Excel sheets within Vercel Hobby serverless limits (50 MB bundle, 10-15s execution)?
**Options Considered:**
1. *Puppeteer / Playwright*: Chromium binary exceeds 50 MB serverless bundle, cold starts take 4-8 seconds, prone to OOM errors on Hobby tier.
2. *PDFKit*: Pure JavaScript PDF generator (~1 MB), generates streaming PDF buffers in under 100ms with zero system binaries.
3. *XLSX (SheetJS)*: Fast in-memory workbook creation and binary buffer export for Excel files.
**Decision:** **PDFKit** for PDF generation and **XLSX / ExcelJS** for Excel generation. Both run synchronously or streaming in Node serverless functions with minimal footprint.
**Confidence:** High

### Decision 4: Typography and 1-Bit Pixel Aesthetic
**Question:** How to deliver a retro 1-bit pixel aesthetic with <50 KB transferred and no external network calls?
**Options Considered:**
1. *Google Fonts CDN*: Adds external render-blocking network requests, violates offline/zero-third-party requirements.
2. *Self-hosted VT323 WOFF2*: Subsetted VT323 font file (~14 KB) hosted directly in `/public/fonts/`, loaded with `font-display: swap` and fallback to `monospace`.
**Decision:** **Self-hosted subsetted VT323 WOFF2** with monospace fallback, paired with pure `#000000` / `#ffffff` and a single `#767676` disabled grey in a single compressed stylesheet (`globals.css`).
**Confidence:** High

## Findings & Best Practices
- **Timezone**: All date computations (calendar day bounds, 1 July academic year cutoff, 7th day of M+1 archival cutoff) must strictly use `Asia/Kolkata` (UTC+5:30) via `date-fns-tz` or standard Intl APIs to avoid UTC boundary bugs.
- **Server Actions CSRF**: Next.js Server Actions automatically validate the `Origin` / `Host` header against incoming requests, providing native CSRF resistance.
- **Roster File Upload**: CSV/XLSX parsed in-memory on the server; preview rendered on admin UI before committing atomic database batch transaction.

## Dependencies Identified
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `^15` or `^14` | Core fullstack framework (App Router) |
| `react` / `react-dom` | Latest | UI library |
| `drizzle-orm` | Latest | Type-safe ORM for PostgreSQL |
| `@neondatabase/serverless` / `pg` | Latest | Postgres connection pool |
| `drizzle-kit` | Latest | Schema migrations and prototyping |
| `jose` | Latest | Signed JWT session tokens |
| `bcryptjs` / `argon2` | Latest | Password hashing for SMC and Admin accounts |
| `zod` | Latest | Server-side request & schema validation |
| `xlsx` | Latest | Excel (.xlsx) generation and roster ingestion |
| `pdfkit` | Latest | Lightweight serverless PDF rendering |
| `date-fns` & `date-fns-tz` | Latest | IST timezone formatting and boundary calculations |
