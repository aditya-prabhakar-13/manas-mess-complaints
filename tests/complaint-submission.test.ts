/**
 * Comprehensive Integration & Verification Test Suite for Phase 2:
 * Boarder Complaint Flow & Anti-Abuse Engine.
 * Run: npx tsx tests/complaint-submission.test.ts
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { computeYearOfStudy, formatISTDate, getISTDayBounds } from "../src/lib/date-utils";
import {
  MAX_COMPLAINTS_PER_MEAL,
  MAX_COMPLAINTS_PER_DAY_STUDENT,
  MAX_COMPLAINTS_PER_DAY_IP,
  DUPLICATE_WINDOW_HOURS,
  MEAL_LABELS,
} from "../src/lib/complaint-limits";
import { getAvailableMeals } from "../src/lib/gala";

let passed = 0;
let failed = 0;

function assert(condition: boolean | undefined | null, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface StudentRecord {
  id: number;
  rollNumber: string;
  name: string;
  block: string;
  roomNumber: string;
  course: string;
  yearOfJoining: number;
  isActive: boolean;
}

interface ComplaintRecord {
  id: number;
  studentId: number;
  rollNumber: string;
  nameSnapshot: string;
  courseSnapshot: string;
  yearOfStudySnapshot: string;
  blockRoomSnapshot: string;
  meal: string;
  complaintText: string;
  isDeleted: boolean;
  createdAt: Date;
}

interface SubmissionLogRecord {
  rollNumber: string;
  ipAddress: string;
  outcome: string;
  meal?: string;
  attemptedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY INTEGRATION HARNESS (Mirroring Postgres Pipeline)
// ─────────────────────────────────────────────────────────────────────────────
class ComplaintPipelineHarness {
  students: StudentRecord[] = [
    {
      id: 1,
      rollNumber: "240101001",
      name: "AARAV SHARMA",
      block: "A",
      roomNumber: "214",
      course: "B.Tech Computer Science and Engineering",
      yearOfJoining: 2024,
      isActive: true,
    },
    {
      id: 2,
      rollNumber: "240101002",
      name: "VIKRAM SINGH",
      block: "B",
      roomNumber: "302",
      course: "B.Tech Mechanical Engineering",
      yearOfJoining: 2024,
      isActive: true,
    },
  ];

  galaDates: string[] = ["2026-10-15"]; // Scheduled Gala Dinner date
  complaints: ComplaintRecord[] = [];
  logs: SubmissionLogRecord[] = [];

  private ComplaintSchema = z.object({
    meal: z.enum(["breakfast", "lunch", "dinner", "gala_dinner"]),
    text: z.string().trim().min(10, "Complaint must be at least 10 characters.").max(2000, "Complaint must not exceed 2000 characters."),
  });

  async submitComplaint(
    studentId: number,
    formData: { meal?: unknown; text?: unknown; website?: unknown },
    ip: string,
    currentTime: Date = new Date()
  ): Promise<{ success: boolean; error?: string; complaint?: ComplaintRecord }> {
    const student = this.students.find((s) => s.id === studentId);
    if (!student || !student.isActive) {
      return { success: false, error: "Unauthorized. Please log in again." };
    }

    // 1. Honeypot Trap
    if (formData.website && String(formData.website).trim().length > 0) {
      this.logs.push({
        rollNumber: student.rollNumber,
        ipAddress: ip,
        outcome: "honeypot",
        attemptedAt: currentTime,
      });
      return { success: false, error: "Submission rejected." };
    }

    // 2. Schema Validation
    const parsed = this.ComplaintSchema.safeParse({
      meal: formData.meal,
      text: formData.text,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid submission data.";
      this.logs.push({
        rollNumber: student.rollNumber,
        ipAddress: ip,
        outcome: "validation_error",
        attemptedAt: currentTime,
      });
      return { success: false, error: msg };
    }

    const { meal, text } = parsed.data;

    // 3. Gala Dinner Scheduling Rule
    const todayIST = formatISTDate(currentTime);
    const isGalaToday = this.galaDates.includes(todayIST);

    if (isGalaToday && meal === "dinner") {
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "gala_validation_error", meal, attemptedAt: currentTime });
      return { success: false, error: "Today is a Gala Dinner date. Dinner has been replaced by Gala Dinner. Please select Gala Dinner." };
    }

    if (!isGalaToday && meal === "gala_dinner") {
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "gala_validation_error", meal, attemptedAt: currentTime });
      return { success: false, error: "Gala Dinner is not scheduled for today." };
    }

    // 4. 24-Hour Duplicate Content Check
    const windowStart = new Date(currentTime.getTime() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);
    const hasDuplicate = this.complaints.some(
      (c) =>
        c.studentId === studentId &&
        !c.isDeleted &&
        c.createdAt >= windowStart &&
        c.createdAt <= currentTime &&
        c.complaintText.trim().toLowerCase() === text.trim().toLowerCase()
    );

    if (hasDuplicate) {
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "duplicate", meal, attemptedAt: currentTime });
      return { success: false, error: "Duplicate submission. You have already submitted an identical complaint within the last 24 hours." };
    }

    // 5. Daily IP Limit Check (40/day)
    const { startOfDay, endOfDay } = getISTDayBounds(currentTime);
    const ipCount = this.logs.filter((l) => l.ipAddress === ip && l.attemptedAt >= startOfDay && l.attemptedAt <= endOfDay).length;
    if (ipCount >= MAX_COMPLAINTS_PER_DAY_IP) {
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "rate_limit_ip", meal, attemptedAt: currentTime });
      return { success: false, error: "IP rate limit exceeded (max 40 submissions per day). Please try again tomorrow." };
    }

    // 6. Daily Student Limit Check (6/day)
    const studentCount = this.complaints.filter(
      (c) => c.studentId === studentId && !c.isDeleted && c.createdAt >= startOfDay && c.createdAt <= endOfDay
    ).length;
    if (studentCount >= MAX_COMPLAINTS_PER_DAY_STUDENT) {
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "rate_limit_day", meal, attemptedAt: currentTime });
      return { success: false, error: "Daily limit reached (max 6 complaints per day). Limit resets at midnight IST." };
    }

    // 7. Per-Meal Limit Check (3/meal/day)
    const mealCount = this.complaints.filter(
      (c) => c.studentId === studentId && c.meal === meal && !c.isDeleted && c.createdAt >= startOfDay && c.createdAt <= endOfDay
    ).length;
    if (mealCount >= MAX_COMPLAINTS_PER_MEAL) {
      const mealLabel = MEAL_LABELS[meal] ?? meal;
      this.logs.push({ rollNumber: student.rollNumber, ipAddress: ip, outcome: "rate_limit_meal", meal, attemptedAt: currentTime });
      return { success: false, error: `You have reached the maximum of 3 complaints for ${mealLabel} today. Limit resets at midnight IST.` };
    }

    // 8. Immutable Snapshot Creation
    const { label: yearLabel } = computeYearOfStudy(student.yearOfJoining, currentTime);
    const newComplaint: ComplaintRecord = {
      id: this.complaints.length + 1,
      studentId: student.id,
      rollNumber: student.rollNumber,
      nameSnapshot: student.name,
      courseSnapshot: student.course,
      yearOfStudySnapshot: yearLabel,
      blockRoomSnapshot: `${student.block}-${student.roomNumber}`,
      meal,
      complaintText: text,
      isDeleted: false,
      createdAt: currentTime,
    };

    this.complaints.push(newComplaint);
    this.logs.push({
      rollNumber: student.rollNumber,
      ipAddress: ip,
      outcome: "success",
      meal,
      attemptedAt: currentTime,
    });

    return { success: true, complaint: newComplaint };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function runTests() {
  const harness = new ComplaintPipelineHarness();
  const testDate = new Date("2026-10-11T08:00:00.000Z"); // Oct 11 IST 1:30 PM
  const testIP = "192.168.1.100";

  console.log("\n── 1. Valid Complaint Submission & Immutable Snapshots ────────");
  const res1 = await harness.submitComplaint(
    1,
    { meal: "breakfast", text: "The idlis served today were stone cold and hard." },
    testIP,
    testDate
  );
  assert(res1.success === true, "Valid complaint submits successfully");
  assert(res1.complaint?.nameSnapshot === "AARAV SHARMA", "Name snapshot accurately saved");
  assert(res1.complaint?.blockRoomSnapshot === "A-214", "Block-Room snapshot accurately saved");
  assert(res1.complaint?.yearOfStudySnapshot === "3rd Year", "Year of study dynamically calculated (3rd Year)");
  assert(res1.complaint?.courseSnapshot === "B.Tech Computer Science and Engineering", "Course snapshot preserved");

  // Mutate student roster record in harness
  harness.students[0].name = "AARAV SHARMA (MODIFIED)";
  harness.students[0].roomNumber = "500";
  assert(res1.complaint?.nameSnapshot === "AARAV SHARMA", "Snapshot is immutable — student name change does not affect snapshot");
  assert(res1.complaint?.blockRoomSnapshot === "A-214", "Snapshot is immutable — room change does not affect snapshot");

  console.log("\n── 2. Honeypot Anti-Spam Trap ─────────────────────────────────");
  const botRes = await harness.submitComplaint(
    1,
    { meal: "lunch", text: "Cheap pharmacy pills http://spam.xyz buy now", website: "http://bot.xyz" },
    testIP,
    testDate
  );
  assert(botRes.success === false, "Honeypot submission is rejected");
  assert(botRes.error === "Submission rejected.", "Honeypot returns generic rejection message");
  assert(!harness.complaints.some((c) => c.complaintText.includes("pharmacy")), "Honeypot submission was NOT saved to complaints");
  assert(harness.logs.some((l) => l.outcome === "honeypot"), "Honeypot attempt logged in submission_log");

  console.log("\n── 3. Character Limits Validation (10 - 2000 chars) ───────────");
  const tooShort = await harness.submitComplaint(1, { meal: "lunch", text: "Bad food" }, testIP, testDate);
  assert(tooShort.success === false, "Short text (<10 chars) rejected");
  assert(tooShort.error?.includes("at least 10 characters"), "Error specifies minimum 10 characters");

  const whitespaceOnly = await harness.submitComplaint(1, { meal: "lunch", text: "              " }, testIP, testDate);
  assert(whitespaceOnly.success === false, "Whitespace-only text rejected");

  const tooLongText = "A".repeat(2001);
  const tooLong = await harness.submitComplaint(1, { meal: "lunch", text: tooLongText }, testIP, testDate);
  assert(tooLong.success === false, "Excessive text (>2000 chars) rejected");
  assert(tooLong.error?.includes("not exceed 2000 characters"), "Error specifies maximum 2000 characters");

  console.log("\n── 4. 24-Hour Duplicate Content Check ─────────────────────────");
  const dup1 = await harness.submitComplaint(
    1,
    { meal: "lunch", text: "The paneer gravy was completely sour and smelled spoiled." },
    testIP,
    testDate
  );
  assert(dup1.success === true, "First unique complaint accepted");

  const dup2 = await harness.submitComplaint(
    1,
    { meal: "dinner", text: "  THE PANEER GRAVY WAS COMPLETELY SOUR AND SMELLED SPOILED.  " },
    testIP,
    new Date(testDate.getTime() + 60 * 60 * 1000) // 1 hour later
  );
  assert(dup2.success === false, "Identical text within 24h is rejected");
  assert(dup2.error?.includes("within the last 24 hours"), "Duplicate error message matches spec");

  // Other student submitting identical text is allowed
  const otherStudentDup = await harness.submitComplaint(
    2,
    { meal: "lunch", text: "The paneer gravy was completely sour and smelled spoiled." },
    testIP,
    testDate
  );
  assert(otherStudentDup.success === true, "Another student submitting same complaint text is allowed");

  // Same student after 24h (25 hours later) is allowed
  const expiredDup = await harness.submitComplaint(
    1,
    { meal: "lunch", text: "The paneer gravy was completely sour and smelled spoiled." },
    testIP,
    new Date(testDate.getTime() + 25 * 60 * 60 * 1000) // 25 hours later
  );
  assert(expiredDup.success === true, "Identical complaint text allowed after 24 hours elapsed");

  console.log("\n── 5. Per-Meal Rate Limit (Max 3 / meal / day) ─────────────────");
  // Student 2 already submitted 1 lunch complaint. Add 2 more lunch complaints.
  const s2Lunch2 = await harness.submitComplaint(2, { meal: "lunch", text: "Rice was uncooked and sticky." }, testIP, testDate);
  const s2Lunch3 = await harness.submitComplaint(2, { meal: "lunch", text: "Sambar lacked vegetables completely." }, testIP, testDate);
  assert(s2Lunch2.success && s2Lunch3.success, "Student 2 submitted 3rd lunch complaint");

  const s2Lunch4 = await harness.submitComplaint(2, { meal: "lunch", text: "Cabbage sabzi had insects in it." }, testIP, testDate);
  assert(s2Lunch4.success === false, "4th lunch complaint for Student 2 blocked");
  assert(s2Lunch4.error?.includes("maximum of 3 complaints for Lunch today"), "Meal limit message matches spec");

  // Student 2 can still submit breakfast
  const s2Breakfast = await harness.submitComplaint(2, { meal: "breakfast", text: "Tea flask was empty at 9:00 AM." }, testIP, testDate);
  assert(s2Breakfast.success === true, "Breakfast complaint allowed after lunch limit reached");

  console.log("\n── 6. Daily Student Rate Limit (Max 6 / day) ───────────────────");
  // Student 2 has: 3 lunch + 1 breakfast = 4 complaints. Submit 2 more to hit 6.
  await harness.submitComplaint(2, { meal: "breakfast", text: "Cold milk served at counter." }, testIP, testDate);
  await harness.submitComplaint(2, { meal: "dinner", text: "Rotis were rock hard and stale." }, testIP, testDate);

  // 7th complaint across all meals must be blocked
  const s2Seventh = await harness.submitComplaint(2, { meal: "dinner", text: "Dal was completely watery." }, testIP, testDate);
  assert(s2Seventh.success === false, "7th daily complaint for Student 2 is blocked");
  assert(s2Seventh.error?.includes("Daily limit reached (max 6 complaints per day)"), "Daily limit message matches spec");

  console.log("\n── 7. Daily IP Rate Limit (Max 40 / day) ───────────────────────");
  const ipSpam = "10.10.10.10";
  // Add 40 logs from this IP
  for (let i = 1; i <= 40; i++) {
    harness.logs.push({
      rollNumber: "240101001",
      ipAddress: ipSpam,
      outcome: "success",
      attemptedAt: testDate,
    });
  }
  const ipBlocked = await harness.submitComplaint(1, { meal: "dinner", text: "Mess tables were dirty and uncleaned." }, ipSpam, testDate);
  assert(ipBlocked.success === false, "41st submission from IP is blocked");
  assert(ipBlocked.error?.includes("IP rate limit exceeded (max 40 submissions per day)"), "IP limit message matches spec");

  console.log("\n── 8. Gala Dinner Dynamic Rules ────────────────────────────────");
  // Non-Gala date (Oct 11): Gala dinner is rejected, regular dinner is allowed
  const nonGalaReject = await harness.submitComplaint(1, { meal: "gala_dinner", text: "Gala dessert was missing." }, testIP, testDate);
  assert(nonGalaReject.success === false, "Gala Dinner rejected on non-Gala date");
  assert(nonGalaReject.error?.includes("Gala Dinner is not scheduled for today"), "Non-Gala date error message matches spec");

  // Gala date (Oct 15): Dinner is rejected, Gala Dinner is allowed
  const galaDate = new Date("2026-10-15T14:00:00.000Z"); // Oct 15 7:30 PM IST
  const galaDinnerReject = await harness.submitComplaint(1, { meal: "dinner", text: "Dinner issue on gala night" }, testIP, galaDate);
  assert(galaDinnerReject.success === false, "Regular Dinner rejected on Gala date");
  assert(galaDinnerReject.error?.includes("Dinner has been replaced by Gala Dinner"), "Gala replacement error matches spec");

  const galaSuccess = await harness.submitComplaint(1, { meal: "gala_dinner", text: "Paneer butter masala ran out early." }, testIP, galaDate);
  assert(galaSuccess.success === true, "Gala Dinner accepted on scheduled Gala date");
  assert(galaSuccess.complaint?.meal === "gala_dinner", "Complaint record meal is gala_dinner");

  console.log("\n── 9. Transfer Budget & Lightweight Performance ───────────────");
  const fontPath = path.join(__dirname, "../public/fonts/vt323.woff2");
  const fontStat = fs.statSync(fontPath);
  assert(fontStat.size < 20000, `Self-hosted VT323 font is under 20 KB (actual: ${Math.round(fontStat.size / 1024)} KB)`);

  const cssPath = path.join(__dirname, "../src/app/globals.css");
  const cssStat = fs.statSync(cssPath);
  assert(cssStat.size < 20000, `Global CSS stylesheet is under 20 KB (actual: ${Math.round(cssStat.size / 1024)} KB)`);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME INTEGRATION TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL PHASE 2 INTEGRATION TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
