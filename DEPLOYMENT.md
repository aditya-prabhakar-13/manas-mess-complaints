# Manas Hostel Mess Complaint Portal — Production Deployment & Operations Guide

## 1. System Architecture Overview

The **Manas Hostel Mess Complaint Portal** is engineered for high performance, zero-cost serverless hosting, and resilience:
- **Frontend & Server Actions**: Next.js 15 (App Router, React 19, TypeScript) hosted on **Vercel Hobby Tier** (Zero Cost).
- **Database**: Serverless PostgreSQL hosted on **Neon Free Tier** (Zero Redis, Zero Paid Addons).
- **Design System**: Strict 1-bit pixel terminal aesthetic (`#000000`, `#ffffff`, `#767676`, `0px` border-radius, VT323 self-hosted font < 20 KB, critical payload < 50 KB).
- **Document Engine**: Pure JavaScript in-process generation using SheetJS (`xlsx`), PDFKit (`pdfkit`), and pure vector SVG (`qrcode`) with zero headless Chromium dependencies.
- **Timezone**: Strict `Asia/Kolkata` (IST) clock engine with midnight boundary calculations and query-time archival rollover.

---

## 2. Prerequisites

1. **GitHub Account**: Repository hosting the project codebase.
2. **Neon Account**: Free serverless Postgres account at [neon.tech](https://neon.tech).
3. **Vercel Account**: Free Hobby tier account at [vercel.com](https://vercel.com).
4. **Node.js**: v20 or higher installed locally.

---

## 3. Step-by-Step Setup Guide

### Step 1: Provision Neon Serverless Postgres

1. Sign in to [neon.tech](https://neon.tech) and create a new project:
   - **Project Name**: `manas-mess-complaints`
   - **Region**: `AWS / ap-southeast-1 (Singapore)` or closest to India.
   - **Database Name**: `neondb`
2. In the Neon Dashboard, copy the **Pooled connection string**.
   It looks like:
   ```text
   postgresql://[user]:[password]@ep-[id]-pooler.[region].aws.neon.tech/neondb?sslmode=require
   ```
3. Set this URL locally in `.env.local` to execute database migrations.

### Step 2: Run Drizzle Migrations

Run database migrations to initialize all 9 tables (`students`, `complaints`, `smc_users`, `admins`, `gala_dates`, `login_attempts`, `submission_log`, `lockouts`, `audit_log`):

```bash
# Generate migration SQL files
npm run db:generate

# Execute migration against Neon database
npm run db:migrate
```

*(Optional)* Seed sample student and hostel records for testing:
```bash
npm run db:seed
```

### Step 3: Configure Environment Variables

Generate a strong 256-bit cryptographic secret for JWT session signing:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Prepare the following production environment variables:

| Variable | Description | Example / Format |
|---|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection string | `postgresql://user:pass@ep-xxx-pooler...neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | 64-char hex string for Jose JWT signing | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `SUPER_ADMIN_USERNAME` | Super Admin initial login username | `admin` |
| `SUPER_ADMIN_PASSWORD` | Super Admin initial login password (min 8 chars) | `SuperSecretPassword2026!` |
| `NEXT_PUBLIC_APP_URL` | Canonical production URL (for QR code encoding) | `https://manas-mess.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL | `https://manas-mess.vercel.app` |
| `NODE_ENV` | Environment mode | `production` |

### Step 4: Deploy to Vercel

1. In the [Vercel Dashboard](https://vercel.com), click **Add New** → **Project**.
2. Select your GitHub repository (`Manas/SMC_Complaint`).
3. In **Build and Output Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
4. In **Environment Variables**, add the 6 keys listed above.
5. Click **Deploy**.
   Vercel will compile the application, trace dependencies, and deploy to their global Edge network.

---

## 4. Post-Deployment Administration & Onboarding

### 1. Super Admin Bootstrap
- Navigate to `https://your-domain.vercel.app/admin/login`.
- Enter the `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` configured in your environment variables.
- On first login, the application automatically bootstraps the super admin record in Postgres, hashes the password via bcrypt, logs the action to `audit_log`, and issues a signed session cookie.

### 2. Bulk Upload Student Resident Roster
- Go to `/admin/roster`.
- Upload the hostel resident list as `.csv` or `.xlsx` (Columns: `Roll Number`, `Name`, `Block` [A-D], `Room Number`, `Course`, `Year of Joining`).
- Review the preview table and delta calculation (`toInsert`, `toUpdate`, `toDeactivate`).
- Click **COMMIT ROSTER CHANGES** to atomize upserts into Postgres.

### 3. Provision SMC Accounts
- Go to `/admin/smc`.
- Click **+ NEW SMC ACCOUNT**.
- Enter the student's Roll Number.
- The system generates a secure 10-character plaintext password displayed in a one-time copy modal.
- Store or deliver the password to the SMC representative.

### 4. Schedule Gala Dinners
- Go to `/admin/gala`.
- Add dates for upcoming hostel festivals or feasts (`YYYY-MM-DD`).
- On these dates, the portal automatically activates the special Gala Dinner meal slot, substituting it for Dinner in the UI and server validation.

### 5. Generate Printable Table Standees
- Go to `/admin/qr`.
- (Optional) Enter a table number (e.g. `12`) or leave blank for a generic standee.
- Click **PRINT QR STANDEE**.
- The page renders a high-contrast 1-bit A4 card with centered SVG vector QR code. Print and place on dining tables.

---

## 5. Operations & Maintenance

### Complaint Archival Rollover
- **Zero Cron Overhead**: Archival is evaluated dynamically at query time (`getActiveFeedCutoffDate`).
- Complaints from month $M$ stay in the active feed (`/smc/complaints`) until the end of the 7th day of month $M+1$ (23:59:59 IST).
- On the 8th day at 00:00 IST, complaints automatically transfer into `/smc/archive` under their corresponding Month-Year category.

### Backups and Regulatory Compliance
- At any time, administrators can navigate to `/admin/export` and download complete, unpaginated system backups in `.xlsx` and `.pdf` formats:
  - Complete Complaints Archive
  - Hostel Student Roster
  - Administrative Audit Trail
  - Security & Authentication Logs

### Moderation & Lockouts
- Abusive or invalid complaints can be soft-deleted with mandatory justification at `/admin/complaints`.
- Students or IPs locked out due to failed attempts can be inspected and cleared instantly at `/admin/logs`.
