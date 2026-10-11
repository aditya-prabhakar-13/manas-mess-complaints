import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { generatePortalQrSvg } from "@/lib/qr-generator";
import { AdminNav } from "../AdminNav";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

interface AdminQrPageProps {
  searchParams: Promise<{
    table?: string;
  }>;
}

export default async function AdminQrPage({ searchParams }: AdminQrPageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const tableNumber = params.table?.trim() || "";

  const portalUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://manas-mess.iitg.ac.in";

  const qrSvg = await generatePortalQrSvg(portalUrl);

  return (
    <main className="page">
      <style>{`
        @media print {
          body, .page {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-wrapper {
            margin: 40px auto !important;
            max-width: 480px !important;
            box-shadow: none !important;
            border: 4px solid #000000 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="container" style={{ maxWidth: "800px" }}>
        {/* ── Screen-only Banner & Nav ────────────────────────────── */}
        <div className="no-print">
          <div className="banner">
            <h1>MANAS HOSTEL</h1>
            <div className="subtitle">ADMINISTRATION — DINING TABLE QR GENERATOR</div>
          </div>

          <AdminNav currentPath="/admin/qr" session={session} />

          {/* Table Number Customizer */}
          <div className="card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: "bold", marginBottom: "8px" }}>
              CUSTOMIZE TABLE NUMBER (OPTIONAL)
            </div>
            <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "12px" }}>
              Leave blank to generate a generic &ldquo;ALL TABLES&rdquo; card, or enter a specific table number before printing.
            </p>

            <form method="get" action="/admin/qr" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                name="table"
                defaultValue={tableNumber}
                placeholder="e.g. 14, B-02, High Table"
                style={{ maxWidth: "220px", fontSize: "0.85rem", padding: "6px 10px" }}
              />
              <button
                type="submit"
                className="btn btn-outline"
                style={{ width: "auto", minHeight: "36px", padding: "6px 16px" }}
              >
                UPDATE CARD
              </button>
            </form>
          </div>

          {/* Print Trigger */}
          <div style={{ marginBottom: "20px", textAlign: "right" }}>
            <PrintButton />
          </div>
        </div>

        {/* ── Printable Dining Table Standee Card ─────────────────── */}
        <div
          className="card print-card-wrapper"
          style={{
            maxWidth: "460px",
            margin: "0 auto",
            padding: "24px 20px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            color: "#000000",
            border: "3px solid #000000",
            boxShadow: "6px 6px 0px #000000",
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              lineHeight: "1.2",
              marginBottom: "4px",
            }}
          >
            MANAS HOSTEL MESS
          </div>

          <div
            style={{
              fontSize: "0.95rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              borderBottom: "2px solid #000000",
              paddingBottom: "8px",
              marginBottom: "16px",
            }}
          >
            FEEDBACK & COMPLAINT PORTAL
          </div>

          {/* Table Indicator Badge */}
          <div
            style={{
              display: "inline-block",
              border: "2px solid #000000",
              padding: "4px 14px",
              fontSize: "1rem",
              fontWeight: "bold",
              letterSpacing: "0.06em",
              marginBottom: "16px",
              textTransform: "uppercase",
            }}
          >
            {tableNumber ? `DINING TABLE: ${tableNumber}` : "ALL DINING TABLES"}
          </div>

          {/* Centered SVG QR Code */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "12px",
              border: "1px dashed #000000",
              maxWidth: "280px",
              margin: "0 auto 16px auto",
              backgroundColor: "#ffffff",
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          {/* Instructions */}
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: "bold",
              lineHeight: "1.4",
              marginBottom: "6px",
            }}
          >
            SCAN WITH ANY PHONE CAMERA
          </div>

          <p
            style={{
              fontSize: "0.8rem",
              lineHeight: "1.4",
              color: "#333333",
              margin: "0 0 12px 0",
            }}
          >
            Submit food, cleanliness, and service complaints directly to the Services Managing Committee (SMC). Instant verification via hostel roll number.
          </p>

          {/* Footer URL */}
          <div
            style={{
              borderTop: "1px solid #000000",
              paddingTop: "8px",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              color: "#555555",
            }}
          >
            {portalUrl}
          </div>
        </div>
      </div>
    </main>
  );
}
