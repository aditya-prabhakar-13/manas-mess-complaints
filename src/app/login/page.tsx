import { redirect } from "next/navigation";
import { getBoarderSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // If already authenticated, redirect to complaint form
  const session = await getBoarderSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "480px" }}>
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">MESS COMPLAINT PORTAL</div>
        </div>

        <LoginForm />

        <p style={{ marginTop: "20px", fontSize: "0.8rem", textAlign: "center", letterSpacing: "0.05em" }}>
          ACCESS RESTRICTED TO REGISTERED BOARDERS
        </p>
      </div>
    </main>
  );
}
