import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { and, eq, ilike, or, desc, count } from "drizzle-orm";
import { AdminNav } from "../AdminNav";
import { ModerationComplaintCard } from "./ModerationComplaintCard";

export const dynamic = "force-dynamic";

interface AdminComplaintsPageProps {
  searchParams: Promise<{
    search?: string;
    meal?: string;
    status?: string;
    page?: string;
  }>;
}

const MEALS = [
  { value: "all", label: "ALL MEALS" },
  { value: "breakfast", label: "BREAKFAST" },
  { value: "lunch", label: "LUNCH" },
  { value: "dinner", label: "DINNER" },
  { value: "gala_dinner", label: "GALA DINNER" },
];

const STATUSES = [
  { value: "all", label: "ALL STATUS" },
  { value: "active", label: "ACTIVE ONLY" },
  { value: "deleted", label: "DELETED ONLY" },
];

export default async function AdminComplaintsPage({
  searchParams,
}: AdminComplaintsPageProps) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const currentSearch = params.search?.trim() || "";
  const currentMeal = params.meal || "all";
  const currentStatus = params.status || "all";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 25;
  const offset = (currentPage - 1) * pageSize;

  // Build conditions
  const conditions = [];

  if (currentMeal !== "all") {
    conditions.push(eq(complaints.meal, currentMeal.toLowerCase()));
  }

  if (currentStatus === "active") {
    conditions.push(eq(complaints.isDeleted, false));
  } else if (currentStatus === "deleted") {
    conditions.push(eq(complaints.isDeleted, true));
  }

  if (currentSearch) {
    const pattern = `%${currentSearch}%`;
    conditions.push(
      or(
        ilike(complaints.rollNumber, pattern),
        ilike(complaints.nameSnapshot, pattern),
        ilike(complaints.complaintText, pattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const [countResult] = await db
    .select({ count: count() })
    .from(complaints)
    .where(whereClause);

  const total = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Rows
  const rows = await db
    .select()
    .from(complaints)
    .where(whereClause)
    .orderBy(desc(complaints.createdAt))
    .limit(pageSize)
    .offset(offset);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (currentSearch) p.set("search", currentSearch);
    if (currentMeal !== "all") p.set("meal", currentMeal);
    if (currentStatus !== "all") p.set("status", currentStatus);
    p.set("page", "1");

    for (const [k, v] of Object.entries(overrides)) {
      if (v === "all" || !v) {
        p.delete(k);
      } else {
        p.set(k, v);
      }
    }
    const qs = p.toString();
    return qs ? `/admin/complaints?${qs}` : "/admin/complaints";
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "860px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — COMPLAINT MODERATION</div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <AdminNav currentPath="/admin/complaints" session={session} />

        {/* ── Search & Filter Action Bar ──────────────────────────── */}
        <div className="card" style={{ padding: "14px 16px", marginBottom: "16px" }}>
          {/* Search bar */}
          <form method="get" action="/admin/complaints" style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                name="search"
                defaultValue={currentSearch}
                placeholder="Search roll number, student name, complaint text..."
                style={{ fontSize: "0.85rem", padding: "6px 10px" }}
              />
              {currentMeal !== "all" && (
                <input type="hidden" name="meal" value={currentMeal} />
              )}
              {currentStatus !== "all" && (
                <input type="hidden" name="status" value={currentStatus} />
              )}
              <button
                type="submit"
                className="btn btn-outline"
                style={{ width: "auto", minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem" }}
              >
                SEARCH
              </button>
            </div>
          </form>

          {/* Meal filter pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            {MEALS.map((m) => {
              const isActive = currentMeal === m.value;
              return (
                <Link
                  key={m.value}
                  href={buildUrl({ meal: m.value })}
                  className="btn btn-outline"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    width: "auto",
                    minHeight: "30px",
                    textDecoration: "none",
                    backgroundColor: isActive ? "var(--fg)" : "var(--bg)",
                    color: isActive ? "var(--bg)" : "var(--fg)",
                  }}
                >
                  {m.label}
                </Link>
              );
            })}
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {STATUSES.map((st) => {
              const isActive = currentStatus === st.value;
              return (
                <Link
                  key={st.value}
                  href={buildUrl({ status: st.value })}
                  className="btn btn-outline"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    width: "auto",
                    minHeight: "30px",
                    textDecoration: "none",
                    backgroundColor: isActive ? "var(--fg)" : "var(--bg)",
                    color: isActive ? "var(--bg)" : "var(--fg)",
                  }}
                >
                  {st.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Results Header ──────────────────────────────────────── */}
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
            FOUND {rows.length} OF {total} TOTAL COMPLAINTS
          </span>
          <span>PAGE {currentPage} OF {totalPages}</span>
        </div>

        {/* ── Feed Stream ─────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#767676",
              fontSize: "1rem",
            }}
          >
            [NO COMPLAINTS MATCH CURRENT SEARCH/FILTER CRITERIA]
          </div>
        ) : (
          <div className="stream">
            {rows.map((c) => (
              <ModerationComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────── */}
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
            {currentPage > 1 ? (
              <Link
                href={buildUrl({ page: (currentPage - 1).toString() })}
                className="btn btn-outline"
                style={{ width: "auto", padding: "6px 16px", fontSize: "0.85rem", textDecoration: "none" }}
              >
                ← PREVIOUS
              </Link>
            ) : (
              <span style={{ color: "#767676", padding: "6px 16px", border: "1px solid #767676", fontSize: "0.85rem" }}>
                ← PREVIOUS
              </span>
            )}

            <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
              PAGE {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={buildUrl({ page: (currentPage + 1).toString() })}
                className="btn btn-outline"
                style={{ width: "auto", padding: "6px 16px", fontSize: "0.85rem", textDecoration: "none" }}
              >
                NEXT →
              </Link>
            ) : (
              <span style={{ color: "#767676", padding: "6px 16px", border: "1px solid #767676", fontSize: "0.85rem" }}>
                NEXT →
              </span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
