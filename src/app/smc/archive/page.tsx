import { redirect } from "next/navigation";
import Link from "next/link";
import { getSmcSession } from "@/lib/auth";
import { logoutSmcAction } from "@/actions/smc-auth";
import {
  getArchivedMonths,
  getArchivedComplaints,
} from "@/lib/archive-query";
import { CommentCard } from "../complaints/CommentCard";
import { MealFilterBar } from "../complaints/MealFilterBar";

export const dynamic = "force-dynamic";

interface ArchivePageProps {
  searchParams: Promise<{
    month?: string;
    meal?: string;
    page?: string;
  }>;
}

export default async function SmcArchivePage({
  searchParams,
}: ArchivePageProps) {
  const session = await getSmcSession();
  if (!session) {
    redirect("/smc");
  }

  const params = await searchParams;
  const currentMeal = params.meal || "all";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  // 1. Fetch available archived months
  const availableMonths = await getArchivedMonths();

  // 2. Determine target month (default to newest archived month)
  const selectedMonth =
    params.month ||
    (availableMonths.length > 0 ? availableMonths[0].monthKey : undefined);

  // 3. Query archived complaints for selected month
  const { complaints, total, totalPages, page, monthLabel } =
    await getArchivedComplaints({
      monthKey: selectedMonth,
      meal: currentMeal,
      page: currentPage,
      pageSize: 25,
    });

  function buildPaginationUrl(targetPage: number) {
    const p = new URLSearchParams();
    if (selectedMonth) p.set("month", selectedMonth);
    if (currentMeal !== "all") p.set("meal", currentMeal);
    p.set("page", targetPage.toString());
    return `/smc/archive?${p.toString()}`;
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">SMC REVIEW PORTAL — ARCHIVE</div>
        </div>

        {/* ── Top Navigation & Logged-In User Bar ─────────────────── */}
        <div
          className="card"
          style={{
            padding: "10px 14px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link
              href="/smc/complaints"
              className="btn btn-outline"
              style={{
                padding: "6px 14px",
                fontSize: "0.85rem",
                width: "auto",
                minHeight: "36px",
                textDecoration: "none",
              }}
            >
              ACTIVE FEED
            </Link>

            <Link
              href="/smc/archive"
              className="btn"
              style={{
                padding: "6px 14px",
                fontSize: "0.85rem",
                width: "auto",
                minHeight: "36px",
                textDecoration: "none",
              }}
            >
              ARCHIVE
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "#767676" }}>
              SMC: <strong>{session.rollNumber}</strong>
            </span>
            <form action={logoutSmcAction} style={{ width: "auto" }}>
              <button
                type="submit"
                className="btn btn-outline"
                style={{
                  minHeight: "32px",
                  padding: "4px 10px",
                  fontSize: "0.8rem",
                  width: "auto",
                }}
              >
                LOG OUT
              </button>
            </form>
          </div>
        </div>

        {/* ── Month Selector Tabs ──────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: "bold",
              marginBottom: "8px",
              letterSpacing: "0.05em",
            }}
          >
            SELECT ARCHIVED MONTH:
          </div>

          {availableMonths.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "12px 16px",
                color: "#767676",
                fontSize: "0.9rem",
              }}
            >
              [NO ARCHIVED MONTHS AVAILABLE YET]
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {availableMonths.map((m) => {
                const isSelected = m.monthKey === selectedMonth;
                const p = new URLSearchParams();
                p.set("month", m.monthKey);
                if (currentMeal !== "all") p.set("meal", currentMeal);
                p.set("page", "1");

                return (
                  <Link
                    key={m.monthKey}
                    href={`/smc/archive?${p.toString()}`}
                    className="btn btn-outline"
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.85rem",
                      width: "auto",
                      minHeight: "36px",
                      textDecoration: "none",
                      backgroundColor: isSelected ? "var(--fg)" : "var(--bg)",
                      color: isSelected ? "var(--bg)" : "var(--fg)",
                    }}
                  >
                    {m.label.toUpperCase()} ({m.count})
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Filter & Export Action Bar ──────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <MealFilterBar
            currentMeal={currentMeal}
            basePath="/smc/archive"
            extraParams={selectedMonth ? { month: selectedMonth } : {}}
          />

          {selectedMonth && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <a
                href={`/api/export/complaints?format=xlsx&view=archive&month=${selectedMonth}&meal=${currentMeal}`}
                download
                className="btn btn-outline"
                style={{
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  width: "auto",
                  minHeight: "36px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                ↓ EXCEL (.XLSX)
              </a>

              <a
                href={`/api/export/complaints?format=pdf&view=archive&month=${selectedMonth}&meal=${currentMeal}`}
                download
                className="btn btn-outline"
                style={{
                  padding: "6px 10px",
                  fontSize: "0.8rem",
                  width: "auto",
                  minHeight: "36px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                ↓ PDF (.PDF)
              </a>
            </div>
          )}
        </div>

        {/* ── Complaints Stream Header ────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "var(--border)",
            marginBottom: "16px",
            fontSize: "0.85rem",
            letterSpacing: "0.05em",
          }}
        >
          <span>
            {selectedMonth
              ? `SHOWING ${complaints.length} OF ${total} COMPLAINTS — ${monthLabel.toUpperCase()}`
              : "NO ARCHIVED COMPLAINTS"}
          </span>
          {totalPages > 0 && (
            <span>PAGE {page} OF {totalPages}</span>
          )}
        </div>

        {/* ── Complaints Feed ─────────────────────────────────────── */}
        {complaints.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#767676",
              fontSize: "1rem",
            }}
          >
            [NO ARCHIVED COMPLAINTS FOUND FOR THIS SELECTION]
          </div>
        ) : (
          <div className="stream">
            {complaints.map((c) => (
              <CommentCard key={c.id} complaint={c} />
            ))}
          </div>
        )}

        {/* ── Pagination Controls ─────────────────────────────────── */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "var(--border)",
            }}
          >
            {page > 1 ? (
              <Link
                href={buildPaginationUrl(page - 1)}
                className="btn btn-outline"
                style={{
                  width: "auto",
                  padding: "6px 16px",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                }}
              >
                ← PREVIOUS
              </Link>
            ) : (
              <span
                style={{
                  color: "#767676",
                  fontSize: "0.9rem",
                  padding: "6px 16px",
                  border: "1px solid #767676",
                }}
              >
                ← PREVIOUS
              </span>
            )}

            <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
              PAGE {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildPaginationUrl(page + 1)}
                className="btn btn-outline"
                style={{
                  width: "auto",
                  padding: "6px 16px",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                }}
              >
                NEXT →
              </Link>
            ) : (
              <span
                style={{
                  color: "#767676",
                  fontSize: "0.9rem",
                  padding: "6px 16px",
                  border: "1px solid #767676",
                }}
              >
                NEXT →
              </span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
