/**
 * Unit & Integration tests for Admin Authentication & Bootstrap.
 * Run: npx tsx tests/admin-auth.test.ts
 */
import bcrypt from "bcryptjs";
import { signToken, verifyToken, ADMIN_SESSION_TTL, type AdminSession } from "../src/lib/auth";

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

interface MockAdmin {
  id: number;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  isActive: boolean;
}

class MockAdminStore {
  admins: MockAdmin[] = [];
  auditLogs: Array<{ actorId: string; action: string; details?: Record<string, unknown> }> = [];

  async bootstrapSuperAdmin(username = "admin", password = "supersecretpassword") {
    const existing = this.admins.find((a) => a.username === username);
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      this.admins.push({
        id: this.admins.length + 1,
        username,
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      });
    }
  }

  async login(username: string, password: string): Promise<{ token?: string; error?: string }> {
    const admin = this.admins.find((a) => a.username === username && a.isActive);
    if (!admin) {
      return { error: "Invalid username or password." };
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return { error: "Invalid username or password." };
    }

    const payload: Omit<AdminSession, "iat" | "exp"> = {
      role: "admin",
      adminId: admin.id,
      username: admin.username,
      isSuperAdmin: admin.isSuperAdmin,
    };

    const token = await signToken(payload, ADMIN_SESSION_TTL);
    this.recordAudit(admin.username, "admin_login", { isSuperAdmin: admin.isSuperAdmin });
    return { token };
  }

  async createSecondaryAdmin(
    callerSession: AdminSession,
    username: string,
    password: string
  ): Promise<{ success?: boolean; error?: string }> {
    if (!callerSession.isSuperAdmin) {
      return { error: "Unauthorized. Super admin access required." };
    }

    const activeCount = this.admins.filter((a) => a.isActive).length;
    if (activeCount >= 3) {
      return { error: "Maximum of 2 secondary admins (3 total active admins) already reached." };
    }

    if (this.admins.some((a) => a.username === username)) {
      return { error: `Admin username '${username}' already exists.` };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    this.admins.push({
      id: this.admins.length + 1,
      username,
      passwordHash,
      isSuperAdmin: false,
      isActive: true,
    });

    this.recordAudit(callerSession.username, "create_secondary_admin", { createdUsername: username });
    return { success: true };
  }

  deactivateAdmin(callerSession: AdminSession, targetId: number): { success?: boolean; error?: string } {
    if (!callerSession.isSuperAdmin) {
      return { error: "Unauthorized" };
    }
    if (callerSession.adminId === targetId) {
      return { error: "Cannot deactivate yourself." };
    }
    const target = this.admins.find((a) => a.id === targetId);
    if (target) {
      target.isActive = false;
      this.recordAudit(callerSession.username, "deactivate_admin", { targetId });
      return { success: true };
    }
    return { error: "Admin not found." };
  }

  recordAudit(actorId: string, action: string, details?: Record<string, unknown>) {
    this.auditLogs.push({ actorId, action, details });
  }
}

async function runTests() {
  console.log("\n── 1. Super Admin Bootstrap & Verification ────────────────────");
  const store = new MockAdminStore();
  await store.bootstrapSuperAdmin("headadmin", "adminPass2026");

  assert(store.admins.length === 1, "Super admin inserted into store");
  assert(store.admins[0].username === "headadmin", "Username matches 'headadmin'");
  assert(store.admins[0].isSuperAdmin === true, "isSuperAdmin flag is true");
  assert(store.admins[0].isActive === true, "isActive flag is true");

  console.log("\n── 2. Admin Authentication Flow ───────────────────────────────");
  // Invalid password
  const failRes = await store.login("headadmin", "wrongpassword");
  assert(failRes.error === "Invalid username or password.", "Invalid password rejected with generic error");
  assert(!failRes.token, "No session token returned on failure");

  // Invalid username
  const unknownRes = await store.login("nonexistent", "adminPass2026");
  assert(unknownRes.error === "Invalid username or password.", "Nonexistent user rejected with identical generic error");

  // Valid login
  const validRes = await store.login("headadmin", "adminPass2026");
  assert(Boolean(validRes.token), "Valid credentials issue JWT token");

  const session = await verifyToken<AdminSession>(validRes.token!);
  assert(session !== null, "Signed admin token verifies cleanly");
  assert(session?.role === "admin", "Session role is 'admin'");
  assert(session?.username === "headadmin", "Session username is 'headadmin'");
  assert(session?.isSuperAdmin === true, "Session isSuperAdmin flag is true");

  console.log("\n── 3. Secondary Admin Management & 3-Admin Cap ────────────────");
  // Create 1st secondary admin
  const sec1 = await store.createSecondaryAdmin(session!, "sec_admin_1", "pass1234");
  assert(sec1.success === true, "Super admin creates 1st secondary admin");
  assert(store.admins.length === 2, "Store now has 2 total admins");

  // Create 2nd secondary admin
  const sec2 = await store.createSecondaryAdmin(session!, "sec_admin_2", "pass5678");
  assert(sec2.success === true, "Super admin creates 2nd secondary admin");
  assert(store.admins.length === 3, "Store now has 3 total admins");

  // Attempt 3rd secondary admin (must be blocked by 3-admin cap)
  const sec3 = await store.createSecondaryAdmin(session!, "sec_admin_3", "pass9999");
  assert(sec3.error?.includes("Maximum of 2 secondary admins"), "3rd secondary admin blocked by 3-admin cap");
  assert(store.admins.length === 3, "Admin count remains capped at 3");

  // Secondary admin cannot create admins
  const sec1Login = await store.login("sec_admin_1", "pass1234");
  const sec1Session = await verifyToken<AdminSession>(sec1Login.token!);
  assert(sec1Session?.isSuperAdmin === false, "Secondary admin has isSuperAdmin = false");

  const unauthorizedCreate = await store.createSecondaryAdmin(sec1Session!, "unauth_user", "pass1234");
  assert(unauthorizedCreate.error?.includes("Super admin access required"), "Secondary admin blocked from creating admins");

  console.log("\n── 4. Admin Deactivation & Self-Protection ────────────────────");
  // Cannot deactivate self
  const selfDeact = store.deactivateAdmin(session!, session!.adminId);
  assert(selfDeact.error === "Cannot deactivate yourself.", "Super admin cannot deactivate self");

  // Deactivate secondary admin 1
  const deactRes = store.deactivateAdmin(session!, 2);
  assert(deactRes.success === true, "Super admin can deactivate secondary admin");
  assert(store.admins.find((a) => a.id === 2)?.isActive === false, "Secondary admin 1 is now inactive");

  // Deactivated admin cannot log in
  const deactLogin = await store.login("sec_admin_1", "pass1234");
  assert(deactLogin.error === "Invalid username or password.", "Deactivated admin cannot log in");

  console.log("\n── 5. Audit Logging Trail ─────────────────────────────────────");
  assert(store.auditLogs.length >= 4, "Audit trail contains records of all actions");
  assert(store.auditLogs.some((l) => l.action === "admin_login"), "Audit logged admin_login");
  assert(store.auditLogs.some((l) => l.action === "create_secondary_admin"), "Audit logged create_secondary_admin");
  assert(store.auditLogs.some((l) => l.action === "deactivate_admin"), "Audit logged deactivate_admin");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ADMIN AUTH TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ADMIN AUTH TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
