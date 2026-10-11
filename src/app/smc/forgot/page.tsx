import Link from "next/link";

export default function SmcForgotPasswordPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "460px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">SMC COMMITTEE PORTAL</div>
        </div>

        {/* ── Info Card ───────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>PASSWORD RECOVERY</span>
          </div>

          <div
            style={{
              padding: "16px 0",
              lineHeight: "1.6",
              fontSize: "1rem",
            }}
          >
            <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
              RESET REQUEST INSTRUCTIONS:
            </p>
            <div
              style={{
                border: "var(--border)",
                padding: "12px",
                backgroundColor: "rgba(0,0,0,0.03)",
                fontSize: "0.95rem",
                letterSpacing: "0.03em",
                marginBottom: "16px",
              }}
            >
              Contact Developer - Aditya Prabhakar, Welfare Secretary, Manas Hostel
            </div>
            <p style={{ fontSize: "0.85rem", color: "#767676" }}>
              SMC credentials are administrative accounts issued by hostel authorities. Password resets require verification by the Welfare Secretary or Hostel Administrator.
            </p>
          </div>

          <div style={{ marginTop: "12px" }}>
            <Link
              href="/smc"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                minHeight: "44px",
              }}
            >
              ← BACK TO SMC LOGIN
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
