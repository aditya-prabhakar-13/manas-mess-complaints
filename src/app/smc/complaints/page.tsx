import { redirect } from "next/navigation";
import Link from "next/link";
import { getSmcSession } from "@/lib/auth";
import { logoutSmcAction } from "@/actions/smc-auth";
import { getActiveComplaints } from "@/lib/complaints-query";
import { CommentCard } from "./CommentCard";
import { MealFilterBar } from "./MealFilterBar";

export const dynamic = "force-dynamic";

interface ComplaintsPageProps {
  searchParams: Promise<{
    meal?: string;
    page?: string;
  }>;
}

export default async function SmcComplaintsPage({
  searchParams,
}: ComplaintsPageProps) {
  const session = await getSmcSession();
  if (!session) {
    redirect("/smc");
  }

  const params = await searchParams;
  const currentMeal = params.meal || "all";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { complaints, total, totalPages, page } = await getActiveComplaints({
    meal: currentMeal,
    page: currentPage,
    pageSize: 25,
  });

  function buildPaginationUrl(targetPage: number) {
    const p = new URLSearchParams();
    if (currentMeal !== "all") p.set("meal", currentMeal);
    p.set("page", targetPage.toString());
    return `/smc/complaints?${p.toString()}`;
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">SMC REVIEW PORTAL</div>
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
              className="btn"
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
              className="btn btn-outline"
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
          <MealFilterBar currentMeal={currentMeal} />

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <a
              href={`/api/export/complaints?format=xlsx&view=active&meal=${currentMeal}`}
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
              href={`/api/export/complaints?format=pdf&view=active&meal=${currentMeal}`}
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
            SHOWING {complaints.length} OF {total} ACTIVE COMPLAINTS
          </span>
          <span>PAGE {page} OF {totalPages}</span>
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
            [NO ACTIVE COMPLAINTS FOUND FOR THIS SELECTION]
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
