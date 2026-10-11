import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";

interface ExportCardProps {
  title: string;
  description: string;
  type: string;
  countLabel?: string;
}

function ExportCard({ title, description, type, countLabel }: ExportCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: "16px 20px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: "bold" }}>{title}</div>
          {countLabel && (
            <span
              style={{
                border: "1px solid currentColor",
                padding: "1px 6px",
                fontSize: "0.75rem",
              }}
            >
              {countLabel}
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.85rem", color: "#767676", margin: 0 }}>
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          paddingTop: "8px",
          borderTop: "1px dashed var(--fg)",
        }}
      >
        <a
          href={`/api/admin/export?type=${type}&format=xlsx`}
          download
          className="btn btn-outline"
          style={{
            minHeight: "36px",
            padding: "6px 16px",
            fontSize: "0.85rem",
            textDecoration: "none",
            width: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>[XLSX]</span> DOWNLOAD EXCEL
        </a>

        <a
          href={`/api/admin/export?type=${type}&format=pdf`}
          download
          className="btn btn-outline"
          style={{
            minHeight: "36px",
            padding: "6px 16px",
            fontSize: "0.85rem",
            textDecoration: "none",
            width: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>[PDF]</span> DOWNLOAD DOCUMENT
        </a>
      </div>
    </div>
  );
}

export default async function AdminExportPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — SYSTEM DATA EXPORTS</div>
        </div>

        <AdminNav currentPath="/admin/export" session={session} />

        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "0.85rem",
            color: "#767676",
          }}
        >
          Download complete, unfiltered database dumps and audit archives for administrative compliance, institutional records, and offline analysis. Exports are generated serverlessly in pure JavaScript.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <ExportCard
            title="1. COMPLETE COMPLAINTS ARCHIVE"
            description="Entire historical log of mess complaints across all meal slots, including archived complaints and soft-deleted entries with moderation audit trails."
            type="complaints"
            countLabel="FEED & ARCHIVE"
          />

          <ExportCard
            title="2. STUDENT RESIDENT ROSTER"
            description="Full hostel roster containing all registered boarders, active/inactive tenancy statuses, room allocations, courses, and join years."
            type="roster"
            countLabel="HOSTEL RESIDENTS"
          />

          <ExportCard
            title="3. ADMINISTRATIVE AUDIT TRAIL"
            description="Immutable chronicle of all governance actions: roster uploads, manual student edits, SMC account creations/resets, Gala dates, and complaint deletions."
            type="audit"
            countLabel="GOVERNANCE LOGS"
          />

          <ExportCard
            title="4. SECURITY & AUTHENTICATION LOGS"
            description="Historical security access records, including recent login attempts, failure lockouts, and complaint submission rate-limiting logs with client IP addresses."
            type="logs"
            countLabel="ACCESS LOGS"
          />
        </div>
      </div>
    </main>
  );
}
