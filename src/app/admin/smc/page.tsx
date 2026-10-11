import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { smcUsers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AdminNav } from "../AdminNav";
import { CreateSmcModal } from "./CreateSmcModal";
import { SmcManageList } from "./SmcManageList";

export const dynamic = "force-dynamic";

export default async function AdminSmcPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const allSmcUsers = await db
    .select()
    .from(smcUsers)
    .orderBy(desc(smcUsers.createdAt));

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION — SMC ACCOUNTS</div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <AdminNav currentPath="/admin/smc" session={session} />

        {/* ── Provisioning Action ─────────────────────────────────── */}
        <CreateSmcModal />

        {/* ── Accounts List ───────────────────────────────────────── */}
        <SmcManageList users={allSmcUsers} />
      </div>
    </main>
  );
}
