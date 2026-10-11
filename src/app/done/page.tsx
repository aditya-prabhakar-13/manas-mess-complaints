import { redirect } from "next/navigation";
import Link from "next/link";
import { getBoarderSession } from "@/lib/auth";
import { logoutBoarderAction } from "@/actions/boarder-auth";
import { formatISTDateTime } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export default async function DonePage() {
  const session = await getBoarderSession();
  if (!session) {
    redirect("/login");
  }

  const submissionTime = formatISTDateTime(new Date());

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "480px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">MESS COMPLAINT PORTAL</div>
        </div>

        {/* ── Confirmation Card ───────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>SUBMISSION STATUS: RECORDED</span>
          </div>

          <div
            style={{
              padding: "16px 0",
              textAlign: "center",
              borderBottom: "var(--border)",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: "bold",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              [OK] COMPLAINT RECORDED
            </div>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: "1.4",
                color: "var(--fg)",
              }}
            >
              Your complaint has been logged and submitted to the Services
              Managing Committee (SMC) for review.
            </p>
          </div>

          <div
            style={{
              fontSize: "0.85rem",
              lineHeight: "1.6",
              marginBottom: "20px",
              padding: "8px 12px",
              backgroundColor: "rgba(0,0,0,0.03)",
              border: "1px dashed #767676",
            }}
          >
            <div>
              <span style={{ color: "#767676" }}>SUBMITTER: </span>
              <strong>
                {session.name} ({session.blockRoom})
              </strong>
            </div>
            <div>
              <span style={{ color: "#767676" }}>ROLL NUMBER: </span>
              <strong>{session.rollNumber}</strong>
            </div>
            <div>
              <span style={{ color: "#767676" }}>TIMESTAMP: </span>
              <strong>{submissionTime}</strong>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/"
              className="btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                minHeight: "44px",
              }}
            >
              SUBMIT ANOTHER COMPLAINT
            </Link>

            <form action={logoutBoarderAction} style={{ width: "100%" }}>
              <button
                type="submit"
                className="btn btn-outline"
                style={{
                  minHeight: "44px",
                  width: "100%",
                }}
              >
                LOG OUT
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
