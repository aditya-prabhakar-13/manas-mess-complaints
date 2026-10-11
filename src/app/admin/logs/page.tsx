import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import {
  lockouts,
  loginAttempts,
  submissionLog,
  auditLog,
} from "@/db/schema";
import { desc, gt } from "drizzle-orm";
import { formatISTDateTime } from "@/lib/date-utils";
import { AdminNav } from "../AdminNav";
import { clearLockoutAction } from "@/actions/lockout-actions";

export const dynamic = "force-dynamic";

interface AdminLogsPageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

const TABS = [
  { id: "lockouts", label: "ACTIVE LOCKOUTS" },
  { id: "logins", label: "LOGIN ATTEMPTS" },
  { id: "submissions", label: "SUBMISSION LOGS" },
  { id: "audit", label: "AUDIT TRAIL" },
];

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const currentTab = params.tab || "lockouts";

  // Fetch relevant data based on tab
  const activeLockouts =
    currentTab === "lockouts"
      ? await db
          .select()
          .from(lockouts)
          .where(gt(lockouts.lockedUntil, new Date()))
          .orderBy(desc(lockouts.lockedUntil))
      : [];

  const recentLogins =
    currentTab === "logins"
      ? await db
          .select()
          .from(loginAttempts)
          .orderBy(desc(loginAttempts.attemptedAt))
          .limit(50)
      : [];

  const recentSubmissions =
    currentTab === "submissions"
      ? await db
          .select()
          .from(submissionLog)
          .orderBy(desc(submissionLog.attemptedAt))
          .limit(50)
      : [];

  const recentAudit =
    currentTab === "audit"
      ? await db
          .select()
          .from(auditLog)
          .orderBy(desc(auditLog.createdAt))
          .limit(50)
      : [];

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "880px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — LOGS & LOCKOUTS</div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <AdminNav currentPath="/admin/logs" session={session} />

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          {TABS.map((t) => {
            const isActive = currentTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/admin/logs?tab=${t.id}`}
                className="btn btn-outline"
                style={{
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  width: "auto",
                  minHeight: "34px",
                  textDecoration: "none",
                  backgroundColor: isActive ? "var(--fg)" : "var(--bg)",
                  color: isActive ? "var(--bg)" : "var(--fg)",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ── Tab Content: Active Lockouts ────────────────────────── */}
        {currentTab === "lockouts" && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "var(--border)",
              }}
            >
              ACTIVE SECURITY LOCKOUTS ({activeLockouts.length})
            </div>

            {activeLockouts.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#767676" }}>
                [NO ACTIVE IP OR ROLL NUMBER LOCKOUTS]
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "8px 6px" }}>TYPE</th>
                      <th style={{ padding: "8px 6px" }}>TARGET VALUE</th>
                      <th style={{ padding: "8px 6px" }}>LOCKED UNTIL (IST)</th>
                      <th style={{ padding: "8px 6px" }}>REASON</th>
                      <th style={{ padding: "8px 6px", textAlign: "right" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLockouts.map((l) => (
                      <tr key={l.id} style={{ borderBottom: "1px solid #222222" }}>
                        <td style={{ padding: "8px 6px" }}>
                          <span
                            style={{
                              border: "1px solid currentColor",
                              padding: "1px 6px",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                            }}
                          >
                            {l.keyType.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          <strong>{l.keyValue}</strong>
                        </td>
                        <td style={{ padding: "8px 6px" }}>
                          {formatISTDateTime(l.lockedUntil)}
                        </td>
                        <td style={{ padding: "8px 6px", color: "#767676" }}>
                          {l.reason}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "right" }}>
                          <form action={clearLockoutAction} style={{ display: "inline" }}>
                            <input type="hidden" name="lockoutId" value={l.id} />
                            <button
                              type="submit"
                              className="btn btn-outline"
                              style={{
                                minHeight: "26px",
                                padding: "2px 8px",
                                fontSize: "0.75rem",
                                width: "auto",
                              }}
                            >
                              CLEAR LOCKOUT
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab Content: Login Attempts ─────────────────────────── */}
        {currentTab === "logins" && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "var(--border)",
              }}
            >
              LATEST 50 LOGIN ATTEMPTS
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>TIME (IST)</th>
                    <th style={{ padding: "8px 6px" }}>USER TYPE</th>
                    <th style={{ padding: "8px 6px" }}>IDENTIFIER</th>
                    <th style={{ padding: "8px 6px" }}>IP ADDRESS</th>
                    <th style={{ padding: "8px 6px" }}>OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogins.map((lg) => (
                    <tr key={lg.id} style={{ borderBottom: "1px solid #222222" }}>
                      <td style={{ padding: "8px 6px", color: "#767676" }}>
                        {formatISTDateTime(lg.attemptedAt)}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {lg.userType.toUpperCase()}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <strong>{lg.identifier}</strong>
                      </td>
                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                        {lg.ipAddress}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {lg.outcome === "success" ? (
                          <span style={{ color: "var(--fg)" }}>[SUCCESS]</span>
                        ) : lg.outcome === "lockout" ? (
                          <span style={{ color: "#ff4444" }}>[LOCKED OUT]</span>
                        ) : (
                          <span style={{ color: "#767676" }}>[FAILED]</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab Content: Submission Logs ────────────────────────── */}
        {currentTab === "submissions" && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "var(--border)",
              }}
            >
              LATEST 50 COMPLAINT SUBMISSION ATTEMPTS
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>TIME (IST)</th>
                    <th style={{ padding: "8px 6px" }}>ROLL NO</th>
                    <th style={{ padding: "8px 6px" }}>MEAL</th>
                    <th style={{ padding: "8px 6px" }}>IP ADDRESS</th>
                    <th style={{ padding: "8px 6px" }}>OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #222222" }}>
                      <td style={{ padding: "8px 6px", color: "#767676" }}>
                        {formatISTDateTime(s.attemptedAt)}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <strong>{s.rollNumber}</strong>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {s.meal?.toUpperCase() || "—"}
                      </td>
                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                        {s.ipAddress}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {s.outcome === "success" ? (
                          <span style={{ color: "var(--fg)" }}>[SUCCESS]</span>
                        ) : (
                          <span style={{ color: "#767676" }}>[{s.outcome.toUpperCase()}]</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab Content: Audit Trail ────────────────────────────── */}
        {currentTab === "audit" && (
          <div className="card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "bold",
                marginBottom: "12px",
                paddingBottom: "8px",
                borderBottom: "var(--border)",
              }}
            >
              LATEST 50 ADMINISTRATIVE AUDIT ACTIONS
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>TIME (IST)</th>
                    <th style={{ padding: "8px 6px" }}>ACTOR</th>
                    <th style={{ padding: "8px 6px" }}>ACTION</th>
                    <th style={{ padding: "8px 6px" }}>TARGET</th>
                    <th style={{ padding: "8px 6px" }}>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAudit.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #222222" }}>
                      <td style={{ padding: "8px 6px", color: "#767676" }}>
                        {formatISTDateTime(a.createdAt)}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <strong>{a.actorId}</strong>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <span
                          style={{
                            border: "1px solid currentColor",
                            padding: "1px 6px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {a.targetType ? `${a.targetType} #${a.targetId || ""}` : "—"}
                      </td>
                      <td style={{ padding: "8px 6px", color: "#767676", maxWidth: "250px", wordBreak: "break-all" }}>
                        {a.details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
