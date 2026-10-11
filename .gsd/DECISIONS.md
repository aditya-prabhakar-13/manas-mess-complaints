# DECISIONS.md — Architecture Decision Records

> **Purpose**: Log significant technical decisions and their rationale.

---

## Decisions

### [DECISION-001] Jose JWT Signed HttpOnly Cookies for Session Management

**Date**: 2026-10-11
**Status**: Accepted

#### Context
The portal has three user types: Boarders (14-day non-sliding session), SMC Members (7-day session), and Admins. We need stateless, tamper-proof session tokens that function cleanly in Next.js Server Actions and Edge/Node middleware without heavy database session polling on every request.

#### Decision
Use `jose` to issue HS256-signed JWTs stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies.

#### Rationale
- Zero client bundle footprint for boarder pages.
- Native verification in Next.js middleware and server actions.
- No third-party session store or database lookup needed for static assets or initial route checks.

#### Consequences
Token expiration must be handled explicitly; revocation for compromised admin accounts is enforced via role/version check or deactivation flags.

#### Alternatives Considered
- Auth.js / NextAuth: Adds substantial bundle size and database tables not required for this portal.
- iron-session: Encrypted cookies are viable, but `jose` signed JWTs provide standardized typed claims across Edge and Node runtimes.

---

### [DECISION-002] In-Database Rate Limiting and Lockouts (Zero Redis)

**Date**: 2026-10-11
**Status**: Accepted

#### Context
The portal must run on the free Vercel Hobby tier and Neon serverless Postgres without Redis or paid services. It requires anti-grief limits (3 complaints/meal/day, 6/day/student, 40/day/IP) and a 15-minute lockout on 5 failed logins.

#### Decision
Store login attempts (`login_attempts`), submission records (`complaints`), and lockouts directly in PostgreSQL tables with indexed timestamps and roll/IP fields.

#### Rationale
- Keeps infrastructure strictly within free Postgres without extra third-party dependencies (like Upstash).
- Neon serverless connection handles these indexed aggregate queries with sub-10ms response times.
- Guarantees durability and auditability across all attempts.

#### Consequences
Queries must use efficient indexed lookups (`WHERE attempted_at > NOW() - INTERVAL '15 minutes'`) to prevent table scan overhead.

---

### [DECISION-003] Pure JavaScript Serverless PDF & Excel Exports

**Date**: 2026-10-11
**Status**: Accepted

#### Context
SMC and Admin users need filtered complaint exports in `.xlsx` and `.pdf` formats directly from Vercel serverless routes.

#### Decision
Use `pdfkit` for PDF generation and `xlsx` / `exceljs` for Excel generation. Avoid Puppeteer or headless Chromium.

#### Rationale
- Puppeteer exceeds Vercel Hobby 50 MB serverless bundle limit and causes cold start timeouts.
- Pure JS libraries execute within 50–150ms and consume minimal memory.

---

### [DECISION-004] 1-Bit Pixel Aesthetic with Self-Hosted VT323 Font

**Date**: 2026-10-11
**Status**: Accepted

#### Context
The boarder experience must be lightweight (<50 KB transfer, Lighthouse 95+), mobile-first, and follow a strict black and white pixelated visual design with no external Google Fonts requests.

#### Decision
Self-host a subsetted VT323 `.woff2` font (<20 KB) with monospace fallback (`Courier New`, monospace) and write a single vanilla CSS stylesheet (`globals.css`) adhering to pure `#000000`, `#ffffff`, `#767676`, 2px hard borders, 0 radius, and pixel offset shadows.

---

*Last updated: 2026-10-11*
