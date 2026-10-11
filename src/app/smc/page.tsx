import { redirect } from "next/navigation";
import Link from "next/link";
import { getSmcSession } from "@/lib/auth";
import { SmcLoginForm } from "./SmcLoginForm";

export const dynamic = "force-dynamic";

export default async function SmcLoginPage() {
  const session = await getSmcSession();
  if (session) {
    redirect("/smc/complaints");
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "460px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">SMC COMMITTEE PORTAL</div>
        </div>

        {/* ── Login Card ──────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>SMC MEMBER ACCESS</span>
          </div>

          <SmcLoginForm />

          <div
            style={{
              marginTop: "20px",
              paddingTop: "12px",
              borderTop: "1px dashed #767676",
              textAlign: "center",
              fontSize: "0.85rem",
            }}
          >
            <Link
              href="/smc/forgot"
              style={{
                color: "var(--fg)",
                textDecoration: "underline",
                letterSpacing: "0.05em",
              }}
            >
              FORGOT PASSWORD?
            </Link>
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "16px",
            fontSize: "0.85rem",
          }}
        >
          <Link
            href="/login"
            style={{
              color: "#767676",
              textDecoration: "none",
            }}
          >
            ← Boarder Complaint Form Access
          </Link>
        </div>
      </div>
    </main>
  );
}
