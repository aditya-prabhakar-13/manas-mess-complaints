import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <main className="page">
      <div className="container">
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">ADMINISTRATION PORTAL</div>
        </div>

        <div className="card">
          <div
            style={{
              fontSize: "0.95rem",
              marginBottom: "16px",
              paddingBottom: "8px",
              borderBottom: "var(--border)",
              fontWeight: "bold",
            }}
          >
            ADMINISTRATOR ACCESS
          </div>

          <AdminLoginForm />

          <div
            style={{
              marginTop: "20px",
              paddingTop: "12px",
              borderTop: "var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <Link
              href="/"
              style={{ color: "#767676", textDecoration: "underline" }}
            >
              ← Boarder Portal
            </Link>
            <Link
              href="/smc"
              style={{ color: "#767676", textDecoration: "underline" }}
            >
              SMC Portal →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
