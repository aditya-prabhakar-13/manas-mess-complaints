// Root page — the complaint form.
// Protected by middleware: unauthenticated users are redirected to /login.
// The actual form will be implemented in Phase 2.
import { getBoarderSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getBoarderSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "480px" }}>
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">MESS COMPLAINT PORTAL</div>
        </div>
        <div className="card">
          <p>Complaint form — Phase 2</p>
          <p style={{ marginTop: "12px", fontSize: "0.85rem" }}>
            Logged in as: {session.name} ({session.blockRoom})
          </p>
        </div>
      </div>
    </main>
  );
}
