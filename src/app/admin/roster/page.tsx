import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { asc } from "drizzle-orm";
import { AdminNav } from "../AdminNav";
import { RosterUploadForm } from "./RosterUploadForm";
import { StudentListTable } from "./StudentListTable";

export const dynamic = "force-dynamic";

export default async function AdminRosterPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const allStudents = await db
    .select()
    .from(students)
    .orderBy(asc(students.block), asc(students.roomNumber));

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "900px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — ROSTER MANAGEMENT</div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <AdminNav currentPath="/admin/roster" session={session} />

        {/* ── Bulk Upload & Preview ───────────────────────────────── */}
        <RosterUploadForm />

        {/* ── Student List Table ──────────────────────────────────── */}
        <StudentListTable students={allStudents} />
      </div>
    </main>
  );
}
