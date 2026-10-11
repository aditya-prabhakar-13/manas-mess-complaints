import { redirect } from "next/navigation";
import { getBoarderSession } from "@/lib/auth";
import { logoutBoarderAction } from "@/actions/boarder-auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeYearOfStudy } from "@/lib/date-utils";
import { isGalaDinnerDate, getAvailableMeals } from "@/lib/gala";
import { ComplaintForm } from "./ComplaintForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getBoarderSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch student to ensure fresh year of study & course info
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, session.studentId))
    .limit(1);

  const yearOfJoining = student?.yearOfJoining ?? 2024;
  const { label: yearLabel } = computeYearOfStudy(yearOfJoining);
  const course = student?.course ?? "B.Tech";

  const isGalaDay = await isGalaDinnerDate();
  const mealOptions = getAvailableMeals(isGalaDay);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: "560px" }}>
        {/* ── Banner ──────────────────────────────────────────────── */}
        <div className="banner">
          <h1>MANAS HOSTEL</h1>
          <div className="subtitle">MESS COMPLAINT PORTAL</div>
        </div>

        {/* ── Boarder Info & Logout Header ────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>BOARDER DETAILS (READ-ONLY)</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "0.95rem",
              marginBottom: "12px",
            }}
          >
            <div>
              <span style={{ color: "#767676", fontSize: "0.8rem", display: "block" }}>
                NAME
              </span>
              <strong>{session.name}</strong>
            </div>

            <div>
              <span style={{ color: "#767676", fontSize: "0.8rem", display: "block" }}>
                ROLL NUMBER
              </span>
              <strong>{session.rollNumber}</strong>
            </div>

            <div>
              <span style={{ color: "#767676", fontSize: "0.8rem", display: "block" }}>
                ROOM
              </span>
              <strong>{session.blockRoom}</strong>
            </div>

            <div>
              <span style={{ color: "#767676", fontSize: "0.8rem", display: "block" }}>
                YEAR OF STUDY
              </span>
              <strong>{yearLabel}</strong>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.85rem",
              borderTop: "1px dashed #767676",
              paddingTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#767676" }}>{course}</span>
            <form action={logoutBoarderAction} style={{ width: "auto" }}>
              <button
                type="submit"
                className="btn btn-outline"
                style={{
                  minHeight: "32px",
                  padding: "4px 12px",
                  fontSize: "0.85rem",
                  width: "auto",
                }}
              >
                LOG OUT
              </button>
            </form>
          </div>
        </div>

        {/* ── Complaint Form Card ─────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>NEW COMPLAINT SUBMISSION</span>
          </div>
          <ComplaintForm mealOptions={mealOptions} isGalaDay={isGalaDay} />
        </div>
      </div>
    </main>
  );
}
