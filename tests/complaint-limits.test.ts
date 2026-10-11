/**
 * Unit & Integration tests for complaint limits and anti-abuse checks.
 * Run: npx tsx tests/complaint-limits.test.ts
 */
import {
  MAX_COMPLAINTS_PER_MEAL,
  MAX_COMPLAINTS_PER_DAY_STUDENT,
  MAX_COMPLAINTS_PER_DAY_IP,
  DUPLICATE_WINDOW_HOURS,
  MEAL_LABELS,
} from "../src/lib/complaint-limits";
import { getISTDayBounds } from "../src/lib/date-utils";

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
// IN-MEMORY SIMULATION OF POSTGRES RATE LIMIT QUERIES
// ─────────────────────────────────────────────────────────────────────────────
interface MockComplaint {
  id: number;
  studentId: number;
  rollNumber: string;
  meal: string;
  complaintText: string;
  isDeleted: boolean;
  createdAt: Date;
}

interface MockSubmissionLog {
  rollNumber: string;
  ipAddress: string;
  outcome: string;
  meal?: string;
  attemptedAt: Date;
}

class MockComplaintLimitsStore {
  complaints: MockComplaint[] = [];
  logs: MockSubmissionLog[] = [];

  addComplaint(record: Omit<MockComplaint, "id">) {
    this.complaints.push({
      ...record,
      id: this.complaints.length + 1,
    });
  }

  addLog(record: MockSubmissionLog) {
    this.logs.push(record);
  }

  checkMealLimit(studentId: number, meal: string, refDate: Date = new Date()) {
    const { startOfDay, endOfDay } = getISTDayBounds(refDate);
    const count = this.complaints.filter(
      (c) =>
        c.studentId === studentId &&
        c.meal === meal &&
        !c.isDeleted &&
        c.createdAt >= startOfDay &&
        c.createdAt <= endOfDay
    ).length;

    if (count >= MAX_COMPLAINTS_PER_MEAL) {
      const mealLabel = MEAL_LABELS[meal] ?? meal;
      return {
        allowed: false,
        count,
        error: `You have reached the maximum of 3 complaints for ${mealLabel} today. Limit resets at midnight IST.`,
      };
    }
    return { allowed: true, count };
  }

  checkDailyStudentLimit(studentId: number, refDate: Date = new Date()) {
    const { startOfDay, endOfDay } = getISTDayBounds(refDate);
    const count = this.complaints.filter(
      (c) =>
        c.studentId === studentId &&
        !c.isDeleted &&
        c.createdAt >= startOfDay &&
        c.createdAt <= endOfDay
    ).length;

    if (count >= MAX_COMPLAINTS_PER_DAY_STUDENT) {
      return {
        allowed: false,
        count,
        error: "Daily limit reached (max 6 complaints per day). Limit resets at midnight IST.",
      };
    }
    return { allowed: true, count };
  }

  checkDailyIPLimit(ip: string, refDate: Date = new Date()) {
    const { startOfDay, endOfDay } = getISTDayBounds(refDate);
    const count = this.logs.filter(
      (l) =>
        l.ipAddress === ip &&
        l.attemptedAt >= startOfDay &&
        l.attemptedAt <= endOfDay
    ).length;

    if (count >= MAX_COMPLAINTS_PER_DAY_IP) {
      return {
        allowed: false,
        count,
        error: "IP rate limit exceeded (max 40 submissions per day). Please try again tomorrow.",
      };
    }
    return { allowed: true, count };
  }

  checkDuplicate(studentId: number, text: string, refDate: Date = new Date()) {
    const windowStart = new Date(
      refDate.getTime() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000
    );
    const normalized = text.trim().toLowerCase();

    const hasDuplicate = this.complaints.some(
      (c) =>
        c.studentId === studentId &&
        !c.isDeleted &&
        c.createdAt >= windowStart &&
        c.createdAt <= refDate &&
        c.complaintText.trim().toLowerCase() === normalized
    );

    if (hasDuplicate) {
      return {
        isDuplicate: true,
        error: "Duplicate submission. You have already submitted an identical complaint within the last 24 hours.",
      };
    }
    return { isDuplicate: false };
  }
}

async function runTests() {
  console.log("\n── 1. Per-Meal Daily Limit (Max 3 / meal) ──────────────────────");
  const store = new MockComplaintLimitsStore();
  const testStudentId = 101;
  const now = new Date("2026-10-11T10:00:00.000Z"); // Oct 11 IST daytime

  // Initial state: 0 complaints
  let mealRes = store.checkMealLimit(testStudentId, "breakfast", now);
  assert(mealRes.allowed === true && mealRes.count === 0, "Initial breakfast check allows submission");

  // Add 1st, 2nd, 3rd breakfast complaint
  store.addComplaint({
    studentId: testStudentId,
    rollNumber: "240101001",
    meal: "breakfast",
    complaintText: "Poha is cold and dry.",
    isDeleted: false,
    createdAt: new Date("2026-10-11T02:30:00.000Z"), // 8:00 AM IST
  });
  store.addComplaint({
    studentId: testStudentId,
    rollNumber: "240101001",
    meal: "breakfast",
    complaintText: "Tea is excessively watery.",
    isDeleted: false,
    createdAt: new Date("2026-10-11T03:00:00.000Z"), // 8:30 AM IST
  });
  mealRes = store.checkMealLimit(testStudentId, "breakfast", now);
  assert(mealRes.allowed === true && mealRes.count === 2, "2nd breakfast complaint allowed");

  store.addComplaint({
    studentId: testStudentId,
    rollNumber: "240101001",
    meal: "breakfast",
    complaintText: "No bread butter left at counter.",
    isDeleted: false,
    createdAt: new Date("2026-10-11T03:30:00.000Z"), // 9:00 AM IST
  });

  // 4th complaint for breakfast must be blocked
  mealRes = store.checkMealLimit(testStudentId, "breakfast", now);
  assert(mealRes.allowed === false, "4th breakfast complaint blocked");
  assert(
    mealRes.error?.includes("maximum of 3 complaints for Breakfast today"),
    "Error message specifies meal name and midnight IST reset"
  );

  // But lunch is still allowed (count = 0)
  let lunchRes = store.checkMealLimit(testStudentId, "lunch", now);
  assert(lunchRes.allowed === true && lunchRes.count === 0, "Lunch is still allowed even when breakfast is capped");

  console.log("\n── 2. Daily Student Limit (Max 6 / day) ────────────────────────");
  // Add 3 lunch complaints (student now has 3 breakfast + 3 lunch = 6 total)
  for (let i = 1; i <= 3; i++) {
    store.addComplaint({
      studentId: testStudentId,
      rollNumber: "240101001",
      meal: "lunch",
      complaintText: `Lunch issue number ${i}`,
      isDeleted: false,
      createdAt: new Date("2026-10-11T07:30:00.000Z"), // 1:00 PM IST
    });
  }

  // Daily check should now report blocked
  const dailyStudentRes = store.checkDailyStudentLimit(testStudentId, now);
  assert(dailyStudentRes.allowed === false, "7th daily complaint across meals is blocked");
  assert(
    dailyStudentRes.error?.includes("Daily limit reached (max 6 complaints per day)"),
    "Daily limit error message matches specification"
  );

  // Soft-deleted complaints must NOT count toward limit
  store.complaints[0].isDeleted = true;
  const afterDeleteRes = store.checkDailyStudentLimit(testStudentId, now);
  assert(afterDeleteRes.allowed === true, "Soft-deleted complaint does not count against daily limit");

  console.log("\n── 3. Daily IP Limit (Max 40 / day) ────────────────────────────");
  const testIP = "203.0.113.195";
  for (let i = 1; i <= 39; i++) {
    store.addLog({
      rollNumber: `2401010${i.toString().padStart(2, "0")}`,
      ipAddress: testIP,
      outcome: "success",
      attemptedAt: new Date("2026-10-11T08:00:00.000Z"),
    });
  }
  let ipRes = store.checkDailyIPLimit(testIP, now);
  assert(ipRes.allowed === true, "39 submissions from IP allowed");

  store.addLog({
    rollNumber: "240101040",
    ipAddress: testIP,
    outcome: "success",
    attemptedAt: new Date("2026-10-11T08:05:00.000Z"),
  });
  ipRes = store.checkDailyIPLimit(testIP, now);
  assert(ipRes.allowed === false, "41st submission from IP blocked");
  assert(ipRes.error?.includes("IP rate limit exceeded (max 40 submissions per day)"), "IP limit error matches spec");

  console.log("\n── 4. 24-Hour Duplicate Content Check ─────────────────────────");
  const dupCheck1 = store.checkDuplicate(testStudentId, "Poha is cold and dry.", now);
  // complaint[0] was soft-deleted, complaint[1] was "Tea is excessively watery."
  const dupCheck2 = store.checkDuplicate(testStudentId, "  TEA IS EXCESSIVELY WATERY.  ", now);
  assert(dupCheck2.isDuplicate === true, "Whitespace & case-insensitive identical text detected as duplicate");
  assert(dupCheck2.error?.includes("within the last 24 hours"), "Duplicate error message matches spec");

  // Submitting non-duplicate text is allowed
  const diffCheck = store.checkDuplicate(testStudentId, "Dal tadka had no salt today at dinner.", now);
  assert(diffCheck.isDuplicate === false, "Distinct complaint text is allowed");

  // Text submitted 25 hours ago is NOT a duplicate
  store.addComplaint({
    studentId: testStudentId,
    rollNumber: "240101001",
    meal: "dinner",
    complaintText: "Roti was burnt yesterday evening.",
    isDeleted: false,
    createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
  });
  const expiredDupCheck = store.checkDuplicate(testStudentId, "Roti was burnt yesterday evening.", now);
  assert(expiredDupCheck.isDuplicate === false, "Identical text after 24 hours is permitted");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL COMPLAINT LIMITS TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
