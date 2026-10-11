/**
 * Unit & Integration tests for SMC Authentication.
 * Run: npx tsx tests/smc-auth.test.ts
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, verifyToken, SMC_SESSION_TTL, type SmcSession } from "../src/lib/auth";

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

interface MockSmcUser {
  id: number;
  rollNumber: string;
  passwordHash: string;
  isActive: boolean;
}

const GENERIC_ERROR = "Invalid Roll Number or Password.";

const SmcLoginSchema = z.object({
  rollNumber: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .transform((v) => v.toUpperCase()),
  password: z.string().min(1, "Password is required."),
});

async function runTests() {
  console.log("\n── 1. SMC Mock User Setup & Password Hashing ──────────────────");
  const testPassword = "SmcSecurePass2026!";
  const hash = await bcrypt.hash(testPassword, 10);

  const mockUsers: MockSmcUser[] = [
    {
      id: 1,
      rollNumber: "SMC2026",
      passwordHash: hash,
      isActive: true,
    },
    {
      id: 2,
      rollNumber: "SMC2025_INACTIVE",
      passwordHash: hash,
      isActive: false, // Inactive
    },
  ];

  assert(await bcrypt.compare(testPassword, hash), "Password hash verifies with bcrypt");
  assert(!(await bcrypt.compare("WrongPassword", hash)), "Incorrect password fails bcrypt comparison");

  console.log("\n── 2. SMC Authentication Pipeline Simulation ──────────────────");
  async function authenticateSmc(input: { rollNumber?: unknown; password?: unknown }) {
    const parsed = SmcLoginSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR };
    }

    const { rollNumber, password } = parsed.data;
    const user = mockUsers.find((u) => u.rollNumber === rollNumber && u.isActive);
    if (!user) {
      return { success: false, error: GENERIC_ERROR };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: GENERIC_ERROR };
    }

    const payload: SmcSession = {
      role: "smc",
      smcUserId: user.id,
      rollNumber: user.rollNumber,
    };

    const token = await signToken(payload as Record<string, unknown>, SMC_SESSION_TTL);
    return { success: true, token, user };
  }

  // 1. Valid SMC user logs in
  const resValid = await authenticateSmc({ rollNumber: "smc2026", password: testPassword });
  assert(resValid.success === true, "Active SMC member logs in successfully with valid credentials");
  assert(typeof resValid.token === "string" && resValid.token.length > 20, "JWT session token returned");

  // 2. Token claims verification
  const verified = await verifyToken<SmcSession>(resValid.token!);
  assert(verified !== null, "Signed SMC token verifies cleanly");
  assert(verified?.role === "smc", "Token role is 'smc'");
  assert(verified?.rollNumber === "SMC2026", "Token rollNumber is SMC2026");
  assert(verified?.smcUserId === 1, "Token smcUserId is 1");

  // 3. Wrong password
  const resWrongPass = await authenticateSmc({ rollNumber: "SMC2026", password: "IncorrectPassword" });
  assert(resWrongPass.success === false, "Incorrect password rejected");
  assert(resWrongPass.error === GENERIC_ERROR, "Returns generic error message (never reveals password wrong)");

  // 4. Non-existent roll number
  const resNonExistent = await authenticateSmc({ rollNumber: "UNKNOWN_SMC", password: testPassword });
  assert(resNonExistent.success === false, "Non-existent roll number rejected");
  assert(resNonExistent.error === GENERIC_ERROR, "Returns generic error message (never reveals user unknown)");

  // 5. Inactive SMC member
  const resInactive = await authenticateSmc({ rollNumber: "SMC2025_INACTIVE", password: testPassword });
  assert(resInactive.success === false, "Inactive SMC member rejected");
  assert(resInactive.error === GENERIC_ERROR, "Inactive member receives generic error message");

  // 6. Empty / Malformed input
  const resEmpty = await authenticateSmc({ rollNumber: "  ", password: "" });
  assert(resEmpty.success === false && resEmpty.error === GENERIC_ERROR, "Empty input receives generic error");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL SMC AUTH TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
