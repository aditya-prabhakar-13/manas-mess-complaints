/**
 * Unit & Integration tests for SMC Account Provisioning & Gala Dinner Management.
 * Run: npx tsx tests/admin-management.test.ts
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";

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

interface MockGalaDate {
  id: number;
  galaDate: string;
  description?: string | null;
}

class MockManagementStore {
  smcUsers: MockSmcUser[] = [];
  galaDates: MockGalaDate[] = [];
  auditLogs: Array<{ action: string; targetId?: string; details?: unknown }> = [];

  async createSmcUser(rollNumber: string): Promise<{ success?: boolean; error?: string; password?: string }> {
    const rawRoll = rollNumber.trim().toUpperCase();
    if (!rawRoll || rawRoll.length < 2) {
      return { error: "Please provide a valid roll number." };
    }

    if (this.smcUsers.some((u) => u.rollNumber === rawRoll)) {
      return { error: `SMC user with roll number '${rawRoll}' already exists.` };
    }

    const oneTimePassword = crypto.randomBytes(5).toString("hex").toUpperCase();
    const passwordHash = await bcrypt.hash(oneTimePassword, 10);

    const newUser: MockSmcUser = {
      id: this.smcUsers.length + 1,
      rollNumber: rawRoll,
      passwordHash,
      isActive: true,
    };
    this.smcUsers.push(newUser);

    this.auditLogs.push({
      action: "create_smc_user",
      targetId: newUser.id.toString(),
      details: { rollNumber: rawRoll },
    });

    return { success: true, password: oneTimePassword };
  }

  async resetSmcPassword(userId: number): Promise<{ success?: boolean; error?: string; password?: string }> {
    const user = this.smcUsers.find((u) => u.id === userId);
    if (!user) return { error: "User not found" };

    const oneTimePassword = crypto.randomBytes(5).toString("hex").toUpperCase();
    user.passwordHash = await bcrypt.hash(oneTimePassword, 10);

    this.auditLogs.push({
      action: "reset_smc_password",
      targetId: userId.toString(),
      details: { rollNumber: user.rollNumber },
    });

    return { success: true, password: oneTimePassword };
  }

  toggleSmcStatus(userId: number) {
    const user = this.smcUsers.find((u) => u.id === userId);
    if (user) {
      user.isActive = !user.isActive;
      this.auditLogs.push({
        action: user.isActive ? "activate_smc_user" : "deactivate_smc_user",
        targetId: userId.toString(),
      });
    }
  }

  addGalaDate(galaDate: string, description?: string): { success?: boolean; error?: string } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(galaDate)) {
      return { error: "Invalid date format. Expected YYYY-MM-DD." };
    }
    if (this.galaDates.some((g) => g.galaDate === galaDate)) {
      return { error: "Gala date already scheduled." };
    }
    const newEntry = { id: this.galaDates.length + 1, galaDate, description };
    this.galaDates.push(newEntry);
    this.auditLogs.push({ action: "add_gala_date", targetId: newEntry.id.toString() });
    return { success: true };
  }

  removeGalaDate(id: number) {
    const idx = this.galaDates.findIndex((g) => g.id === id);
    if (idx !== -1) {
      this.galaDates.splice(idx, 1);
      this.auditLogs.push({ action: "remove_gala_date", targetId: id.toString() });
    }
  }

  isGalaDate(dateStr: string): boolean {
    return this.galaDates.some((g) => g.galaDate === dateStr);
  }
}

async function runTests() {
  console.log("\n── 1. SMC User Account Provisioning ───────────────────────────");
  const store = new MockManagementStore();

  const createRes = await store.createSmcUser("smc2026_rep");
  assert(createRes.success === true, "SMC user created successfully");
  assert(Boolean(createRes.password), "Generated one-time plaintext password returned");
  assert(createRes.password?.length === 10, "One-time password is 10 characters long");

  const createdUser = store.smcUsers[0];
  assert(createdUser.rollNumber === "SMC2026_REP", "Roll number normalized to uppercase");
  assert(createdUser.isActive === true, "New SMC account is active");

  const passwordValid = await bcrypt.compare(createRes.password!, createdUser.passwordHash);
  assert(passwordValid, "Generated password verifies against stored bcrypt hash");

  // Duplicate roll rejection
  const dupRes = await store.createSmcUser("smc2026_rep");
  assert(dupRes.error?.includes("already exists"), "Duplicate SMC roll number rejected");

  console.log("\n── 2. SMC Password Reset & Deactivation ───────────────────────");
  const resetRes = await store.resetSmcPassword(1);
  assert(resetRes.success === true, "SMC password reset successfully");
  assert(Boolean(resetRes.password), "New one-time plaintext password returned");
  assert(resetRes.password !== createRes.password, "New password differs from initial password");

  const newPasswordValid = await bcrypt.compare(resetRes.password!, createdUser.passwordHash);
  assert(newPasswordValid, "New password verifies against updated hash");

  // Deactivate
  store.toggleSmcStatus(1);
  assert(createdUser.isActive === false, "SMC status toggled to inactive");

  // Reactivate
  store.toggleSmcStatus(1);
  assert(createdUser.isActive === true, "SMC status toggled back to active");

  console.log("\n── 3. Gala Dinner Scheduling & Date Matching ──────────────────");
  // Invalid format rejected
  const badDate = store.addGalaDate("25-10-2026");
  assert(badDate.error?.includes("Invalid date format"), "Non-YYYY-MM-DD date rejected");

  // Valid date added
  const validDate = store.addGalaDate("2026-10-25", "Diwali Feast");
  assert(validDate.success === true, "Gala date 2026-10-25 added successfully");
  assert(store.isGalaDate("2026-10-25"), "isGalaDate returns true for 2026-10-25");
  assert(!store.isGalaDate("2026-10-26"), "isGalaDate returns false for non-gala date");

  // Duplicate date rejected
  const dupDate = store.addGalaDate("2026-10-25");
  assert(dupDate.error?.includes("already scheduled"), "Duplicate Gala date rejected");

  // Remove date
  store.removeGalaDate(1);
  assert(!store.isGalaDate("2026-10-25"), "Date removed; isGalaDate returns false");

  console.log("\n── 4. Audit Log Entries ───────────────────────────────────────");
  assert(store.auditLogs.some((l) => l.action === "create_smc_user"), "Audit logged create_smc_user");
  assert(store.auditLogs.some((l) => l.action === "reset_smc_password"), "Audit logged reset_smc_password");
  assert(store.auditLogs.some((l) => l.action === "add_gala_date"), "Audit logged add_gala_date");
  assert(store.auditLogs.some((l) => l.action === "remove_gala_date"), "Audit logged remove_gala_date");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ADMIN MANAGEMENT TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ADMIN MANAGEMENT TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
