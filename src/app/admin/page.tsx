import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import {
  students,
  complaints,
  smcUsers,
  admins,
  lockouts,
  galaDates,
} from "@/db/schema";
import { count, eq, gt } from "drizzle-orm";
import { AdminNav } from "./AdminNav";
import { AdminManagePanel } from "./AdminManagePanel";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  // 1. Fetch system metrics
  const [[studentCount], [complaintCount], [smcCount], [lockoutCount], [galaCount]] =
    await Promise.all([
      db.select({ count: count() }).from(students).where(eq(students.isActive, true)),
      db.select({ count: count() }).from(complaints),
      db.select({ count: count() }).from(smcUsers).where(eq(smcUsers.isActive, true)),
      db.select({ count: count() }).from(lockouts).where(gt(lockouts.lockedUntil, new Date())),
      db.select({ count: count() }).from(galaDates),
    ]);

  // 2. Fetch admin list
  const allAdmins = await db.select().from(admins).orderBy(admins.id);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "880px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION DASHBOARD</div>
        </div>

        {/* ── Navigation Bar ──────────────────────────────────────── */}
        <AdminNav currentPath="/admin" session={session} />

        {/* ── Overview Metrics Grid ───────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#767676", marginBottom: "4px" }}>
              ACTIVE STUDENTS
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
              {studentCount?.count ?? 0}
            </div>
            <div style={{ marginTop: "6px" }}>
              <Link href="/admin/roster" style={{ fontSize: "0.75rem", textDecoration: "underline" }}>
                Manage Roster →
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#767676", marginBottom: "4px" }}>
              TOTAL COMPLAINTS
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
              {complaintCount?.count ?? 0}
            </div>
            <div style={{ marginTop: "6px" }}>
              <Link href="/admin/complaints" style={{ fontSize: "0.75rem", textDecoration: "underline" }}>
                Moderate Feed →
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#767676", marginBottom: "4px" }}>
              ACTIVE SMC USERS
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
              {smcCount?.count ?? 0}
            </div>
            <div style={{ marginTop: "6px" }}>
              <Link href="/admin/smc" style={{ fontSize: "0.75rem", textDecoration: "underline" }}>
                Manage SMC →
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#767676", marginBottom: "4px" }}>
              ACTIVE LOCKOUTS
            </div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "bold",
                color: (lockoutCount?.count ?? 0) > 0 ? "var(--fg)" : "#767676",
              }}
            >
              {lockoutCount?.count ?? 0}
            </div>
            <div style={{ marginTop: "6px" }}>
              <Link href="/admin/logs" style={{ fontSize: "0.75rem", textDecoration: "underline" }}>
                Inspect Logs →
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.8rem", color: "#767676", marginBottom: "4px" }}>
              GALA DATES
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
              {galaCount?.count ?? 0}
            </div>
            <div style={{ marginTop: "6px" }}>
              <Link href="/admin/gala" style={{ fontSize: "0.75rem", textDecoration: "underline" }}>
                Manage Dates →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Quick Action Cards ──────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div className="card" style={{ padding: "16px" }}>
            <strong style={{ display: "block", marginBottom: "6px" }}>
              DINING TABLE QR CODE
            </strong>
            <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "12px" }}>
              Generate printable, high-contrast SVG QR codes for mess tables.
            </p>
            <Link href="/admin/qr" className="btn btn-outline" style={{ display: "inline-block", width: "auto" }}>
              PRINT QR CODE →
            </Link>
          </div>

          <div className="card" style={{ padding: "16px" }}>
            <strong style={{ display: "block", marginBottom: "6px" }}>
              SYSTEM DATA EXPORTS
            </strong>
            <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "12px" }}>
              Download complete complaints, roster, logs, and audit records in XLSX or PDF.
            </p>
            <Link href="/admin/export" className="btn btn-outline" style={{ display: "inline-block", width: "auto" }}>
              DOWNLOAD EXPORTS →
            </Link>
          </div>
        </div>

        {/* ── Secondary Admins Governance ─────────────────────────── */}
        <AdminManagePanel
          admins={allAdmins}
          isSuperAdmin={session.isSuperAdmin}
          currentAdminId={session.adminId}
        />
      </div>
    </main>
  );
}
