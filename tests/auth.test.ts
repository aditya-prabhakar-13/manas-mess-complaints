/**
 * Unit tests for auth.ts
 * Run: npx tsx tests/auth.test.ts
 */
import {
  signToken,
  verifyToken,
  BOARDER_SESSION_TTL,
  SMC_SESSION_TTL,
  ADMIN_SESSION_TTL,
  type BoarderSession,
  type SmcSession,
  type AdminSession,
} from "../src/lib/auth";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n── Jose JWT Sign & Verify ─────────────────────────────────────");

  // 1. Boarder token roundtrip
  const boarderPayload: Omit<BoarderSession, "exp" | "iat"> = {
    role: "boarder",
    studentId: 101,
    rollNumber: "240101001",
    name: "AARAV SHARMA",
    block: "A",
    roomNumber: "214",
    blockRoom: "A-214",
  };

  const boarderToken = await signToken(boarderPayload, BOARDER_SESSION_TTL);
  assert(typeof boarderToken === "string" && boarderToken.length > 20, "Boarder token signed successfully");

  const verifiedBoarder = await verifyToken<BoarderSession>(boarderToken);
  assert(verifiedBoarder !== null, "Boarder token verified successfully");
  assert(verifiedBoarder?.role === "boarder", "Payload role is boarder");
  assert(verifiedBoarder?.rollNumber === "240101001", "Payload rollNumber matches");
  assert(verifiedBoarder?.blockRoom === "A-214", "Payload blockRoom matches");

  // 2. SMC token roundtrip
  const smcPayload: Omit<SmcSession, "exp" | "iat"> = {
    role: "smc",
    smcUserId: 5,
    rollNumber: "SMC2026",
  };
  const smcToken = await signToken(smcPayload, SMC_SESSION_TTL);
  const verifiedSmc = await verifyToken<SmcSession>(smcToken);
  assert(verifiedSmc !== null && verifiedSmc.role === "smc", "SMC token verified successfully");
  assert(verifiedSmc?.smcUserId === 5, "SMC user ID matches");

  // 3. Admin token roundtrip
  const adminPayload: Omit<AdminSession, "exp" | "iat"> = {
    role: "admin",
    adminId: 1,
    username: "superadmin",
    isSuperAdmin: true,
  };
  const adminToken = await signToken(adminPayload, ADMIN_SESSION_TTL);
  const verifiedAdmin = await verifyToken<AdminSession>(adminToken);
  assert(verifiedAdmin !== null && verifiedAdmin.role === "admin", "Admin token verified successfully");
  assert(verifiedAdmin?.isSuperAdmin === true, "Admin isSuperAdmin matches");

  // 4. Invalid token rejection
  console.log("\n── Invalid & Tampered Token Rejection ─────────────────────────");
  const tamperedToken = boarderToken.slice(0, -6) + "abcdef";
  const verifiedTampered = await verifyToken(tamperedToken);
  assert(verifiedTampered === null, "Tampered token signature is rejected");

  const invalidGarbage = "not.a.valid.jwt.token";
  const verifiedGarbage = await verifyToken(invalidGarbage);
  assert(verifiedGarbage === null, "Malformed string is rejected");

  // 5. Expired token rejection
  console.log("\n── Expiration Rejection ───────────────────────────────────────");
  const expiredToken = await signToken({ role: "boarder" }, -10); // Expired 10 seconds ago
  const verifiedExpired = await verifyToken(expiredToken);
  assert(verifiedExpired === null, "Expired token is rejected");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL AUTH TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
