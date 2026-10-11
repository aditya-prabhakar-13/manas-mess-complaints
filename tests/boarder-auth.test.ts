/**
 * Unit & Integration tests for Boarder Authentication & Lockout logic.
 * Run: npx tsx tests/boarder-auth.test.ts
 */
import { z } from "zod";
import { signToken, verifyToken, BOARDER_SESSION_TTL, type BoarderSession } from "../src/lib/auth";

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
// 1. INPUT VALIDATION & NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  block: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Invalid block selection." }),
  }),
  roomNumber: z.string().trim().min(1, "Room number is required.").max(20),
  rollNumber: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .max(50)
    .transform((v) => v.toUpperCase()),
});

const GENERIC_ERROR = "Invalid Block, Room Number, or Roll Number.";

function getLockoutMessage(remainingMinutes: number): string {
  return `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOCK ROSTER & IN-MEMORY LOCKOUT ENGINE (Simulating Postgres behaviour)
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

const mockStudents: StudentRecord[] = [
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
    rollNumber: "230102045",
    name: "ROHAN VERMA",
    block: "B",
    roomNumber: "105",
    course: "B.Tech Electronics and Communication Engineering",
    yearOfJoining: 2023,
    isActive: false, // Inactive / Graduated / Suspended
  },
];

interface LoginAttemptRecord {
  identifier: string;
  ipAddress: string;
  outcome: "success" | "failure" | "lockout";
  attemptedAt: Date;
}

class MockRateLimiter {
  private attempts: LoginAttemptRecord[] = [];
  private windowMinutes = 15;
  private maxFailures = 5;

  recordAttempt(
    identifier: string,
    ip: string,
    outcome: "success" | "failure" | "lockout",
    timestamp: Date = new Date()
  ) {
    this.attempts.push({
      identifier: identifier.toUpperCase(),
      ipAddress: ip,
      outcome,
      attemptedAt: timestamp,
    });
  }

  checkLockout(identifier: string, ip: string, now: Date = new Date()) {
    const windowStart = new Date(now.getTime() - this.windowMinutes * 60 * 1000);

    const identifierFailures = this.attempts.filter(
      (a) =>
        a.identifier === identifier.toUpperCase() &&
        a.outcome === "failure" &&
        a.attemptedAt >= windowStart &&
        a.attemptedAt <= now
    );

    const ipFailures = this.attempts.filter(
      (a) =>
        a.ipAddress === ip &&
        a.outcome === "failure" &&
        a.attemptedAt >= windowStart &&
        a.attemptedAt <= now
    );

    if (
      identifierFailures.length >= this.maxFailures ||
      ipFailures.length >= this.maxFailures
    ) {
      const allFailures = [...identifierFailures, ...ipFailures].sort(
        (a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime()
      );
      const latestAttemptTime = allFailures[0]?.attemptedAt.getTime() ?? now.getTime();
      const lockedUntilMs = latestAttemptTime + this.windowMinutes * 60 * 1000;
      const remainingMs = Math.max(0, lockedUntilMs - now.getTime());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));

      return {
        isLocked: true,
        remainingMinutes,
        remainingSeconds,
        unlockAt: new Date(lockedUntilMs),
      };
    }

    return { isLocked: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH VERIFICATION PIPELINE SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
async function authenticateBoarder(
  input: { block?: unknown; roomNumber?: unknown; rollNumber?: unknown },
  ip: string,
  rateLimiter: MockRateLimiter,
  currentTime: Date = new Date()
): Promise<{ success: boolean; error?: string; session?: BoarderSession }> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR };
  }

  const { block, roomNumber, rollNumber } = parsed.data;

  // Check lockout
  const lockout = rateLimiter.checkLockout(rollNumber, ip, currentTime);
  if (lockout.isLocked) {
    rateLimiter.recordAttempt(rollNumber, ip, "lockout", currentTime);
    return {
      success: false,
      error: getLockoutMessage(lockout.remainingMinutes ?? 15),
    };
  }

  // Find student in active roster
  const student = mockStudents.find(
    (s) =>
      s.rollNumber.toUpperCase() === rollNumber &&
      s.block.toUpperCase() === block &&
      s.roomNumber.toLowerCase().trim() === roomNumber.toLowerCase() &&
      s.isActive === true
  );

  if (!student) {
    rateLimiter.recordAttempt(rollNumber, ip, "failure", currentTime);
    const newLockout = rateLimiter.checkLockout(rollNumber, ip, currentTime);
    if (newLockout.isLocked) {
      return {
        success: false,
        error: getLockoutMessage(newLockout.remainingMinutes ?? 15),
      };
    }
    return { success: false, error: GENERIC_ERROR };
  }

  rateLimiter.recordAttempt(rollNumber, ip, "success", currentTime);

  const session: BoarderSession = {
    role: "boarder",
    studentId: student.id,
    rollNumber: student.rollNumber,
    name: student.name,
    block: student.block,
    roomNumber: student.roomNumber,
    blockRoom: `${student.block}-${student.roomNumber}`,
  };

  return { success: true, session };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────
async function runTests() {
  console.log("\n── 1. Input Schema Validation ──────────────────────────────────");
  
  const valid = LoginSchema.safeParse({ block: "A", roomNumber: " 214 ", rollNumber: " 240101001 " });
  assert(valid.success === true, "Valid input parses successfully");
  if (valid.success) {
    assert(valid.data.roomNumber === "214", "Room number is trimmed");
    assert(valid.data.rollNumber === "240101001", "Roll number is uppercased and trimmed");
  }

  const invalidBlock = LoginSchema.safeParse({ block: "E", roomNumber: "214", rollNumber: "240101001" });
  assert(invalidBlock.success === false, "Invalid block 'E' rejected");

  const emptyRoom = LoginSchema.safeParse({ block: "A", roomNumber: "   ", rollNumber: "240101001" });
  assert(emptyRoom.success === false, "Empty room number rejected");

  console.log("\n── 2. Active Student Authentication ────────────────────────────");
  const rateLimiter = new MockRateLimiter();

  // Active student logs in
  const resSuccess = await authenticateBoarder(
    { block: "A", roomNumber: "214", rollNumber: "240101001" },
    "192.168.1.1",
    rateLimiter
  );
  assert(resSuccess.success === true, "Active student in roster logs in successfully");
  assert(resSuccess.session?.blockRoom === "A-214", "Session blockRoom is A-214");

  // Inactive student is rejected with generic error
  const resInactive = await authenticateBoarder(
    { block: "B", roomNumber: "105", rollNumber: "230102045" },
    "192.168.1.1",
    rateLimiter
  );
  assert(resInactive.success === false, "Inactive student rejected");
  assert(resInactive.error === GENERIC_ERROR, "Inactive student receives generic error message");

  // Wrong room number rejected with generic error
  const resWrongRoom = await authenticateBoarder(
    { block: "A", roomNumber: "999", rollNumber: "240101001" },
    "192.168.1.1",
    rateLimiter
  );
  assert(resWrongRoom.success === false && resWrongRoom.error === GENERIC_ERROR, "Wrong room receives generic error");

  console.log("\n── 3. Brute Force Lockout Enforcement (5 failures in 15m) ──────");
  const lockoutLimiter = new MockRateLimiter();
  const testIP = "10.0.0.50";
  const testRoll = "240101099"; // Non-existent student

  // 4 failed attempts: not locked yet
  for (let i = 1; i <= 4; i++) {
    const res = await authenticateBoarder(
      { block: "A", roomNumber: "100", rollNumber: testRoll },
      testIP,
      lockoutLimiter
    );
    assert(res.error === GENERIC_ERROR, `Attempt ${i}/4 returns generic error`);
  }

  // 5th failed attempt: triggers lockout
  const fifthAttempt = await authenticateBoarder(
    { block: "A", roomNumber: "100", rollNumber: testRoll },
    testIP,
    lockoutLimiter
  );
  assert(fifthAttempt.success === false, "5th attempt is rejected");
  assert(
    fifthAttempt.error?.includes("Too many failed attempts"),
    "5th failure returns lockout message with countdown"
  );

  // 6th attempt (even with valid credentials on locked IP) is blocked
  const blockedValid = await authenticateBoarder(
    { block: "A", roomNumber: "214", rollNumber: "240101001" }, // Valid credentials
    testIP, // Locked IP
    lockoutLimiter
  );
  assert(blockedValid.success === false, "Locked IP is blocked even with valid student credentials");
  assert(
    blockedValid.error?.includes("Too many failed attempts"),
    "Locked IP receives lockout error message"
  );

  // After 16 minutes, lockout is cleared
  const futureTime = new Date(Date.now() + 16 * 60 * 1000);
  const afterLockout = await authenticateBoarder(
    { block: "A", roomNumber: "214", rollNumber: "240101001" },
    testIP,
    lockoutLimiter,
    futureTime
  );
  assert(afterLockout.success === true, "Lockout expires after 15 minutes and valid login succeeds");

  console.log("\n── 4. Session Token Signing & TTL ─────────────────────────────");
  const token = await signToken(resSuccess.session as Record<string, unknown>, BOARDER_SESSION_TTL);
  const verified = await verifyToken<BoarderSession>(token);
  assert(verified !== null, "Boarder session token signs and verifies cleanly");
  assert(verified?.studentId === 1, "Session contains studentId: 1");
  assert(verified?.name === "AARAV SHARMA", "Session contains student name");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL BOARDER AUTH TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
