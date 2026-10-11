import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { galaDates } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AdminNav } from "../AdminNav";
import { GalaDateList } from "./GalaDateList";

export const dynamic = "force-dynamic";

export default async function AdminGalaPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const allGalaDates = await db
    .select()
    .from(galaDates)
    .orderBy(desc(galaDates.galaDate));

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — GALA DINNER DATES</div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <AdminNav currentPath="/admin/gala" session={session} />

        {/* ── Gala Dates List & Schedule Form ─────────────────────── */}
        <GalaDateList dates={allGalaDates} />
      </div>
    </main>
  );
}
