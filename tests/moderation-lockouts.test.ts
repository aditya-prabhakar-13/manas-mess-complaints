/**
 * Unit & Integration tests for Complaints Moderation & Lockout Inspector.
 * Run: npx tsx tests/moderation-lockouts.test.ts
 */

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

interface MockComplaint {
  id: number;
  rollNumber: string;
  complaintText: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  deletedReason?: string | null;
}

interface MockLockout {
  id: number;
  keyType: "ip" | "roll_number";
  keyValue: string;
  lockedUntil: Date;
  reason: string;
}

class MockModerationStore {
  complaints: MockComplaint[] = [];
  lockouts: MockLockout[] = [];
  auditLogs: Array<{ actorId: string; action: string; targetId?: string; details?: unknown }> = [];

  softDelete(
    caller: { role: string; username: string },
    complaintId: number,
    reason: string
  ): { success?: boolean; error?: string } {
    if (caller.role !== "admin") {
      return { error: "Unauthorized. Admin session required." };
    }

    if (!reason || reason.trim().length < 5) {
      return { error: "Please provide a specific deletion reason (minimum 5 characters)." };
    }

    const complaint = this.complaints.find((c) => c.id === complaintId);
    if (!complaint) {
      return { error: "Complaint not found." };
    }

    complaint.isDeleted = true;
    complaint.deletedAt = new Date();
    complaint.deletedBy = caller.username;
    complaint.deletedReason = reason.trim();

    this.auditLogs.push({
      actorId: caller.username,
      action: "soft_delete_complaint",
      targetId: complaintId.toString(),
      details: { reason: reason.trim() },
    });

    return { success: true };
  }

  restore(caller: { role: string; username: string }, complaintId: number): { success?: boolean; error?: string } {
    if (caller.role !== "admin") {
      return { error: "Unauthorized. Admin session required." };
    }

    const complaint = this.complaints.find((c) => c.id === complaintId);
    if (!complaint) {
      return { error: "Complaint not found." };
    }

    complaint.isDeleted = false;
    complaint.deletedAt = null;
    complaint.deletedBy = null;
    complaint.deletedReason = null;

    this.auditLogs.push({
      actorId: caller.username,
      action: "restore_complaint",
      targetId: complaintId.toString(),
    });

    return { success: true };
  }

  clearLockout(caller: { role: string; username: string }, lockoutId: number): { success?: boolean; error?: string } {
    if (caller.role !== "admin") {
      return { error: "Unauthorized. Admin session required." };
    }

    const idx = this.lockouts.findIndex((l) => l.id === lockoutId);
    if (idx === -1) {
      return { error: "Lockout not found." };
    }

    const removed = this.lockouts[idx];
    this.lockouts.splice(idx, 1);

    this.auditLogs.push({
      actorId: caller.username,
      action: "clear_lockout",
      targetId: lockoutId.toString(),
      details: { keyValue: removed.keyValue, keyType: removed.keyType },
    });

    return { success: true };
  }
}

async function runTests() {
  console.log("\n── 1. Soft Deletion & Mandatory Justification ─────────────────");
  const store = new MockModerationStore();
  const admin = { role: "admin", username: "super_admin" };
  const boarder = { role: "boarder", username: "240101001" };

  store.complaints.push({
    id: 101,
    rollNumber: "240101001",
    complaintText: "Abusive content here.",
    isDeleted: false,
  });

  // Non-admin rejected
  const unauthRes = store.softDelete(boarder, 101, "Should be deleted");
  assert(unauthRes.error?.includes("Unauthorized"), "Non-admin blocked from soft-deleting");

  // Short reason rejected
  const shortReasonRes = store.softDelete(admin, 101, "bad");
  assert(shortReasonRes.error?.includes("minimum 5 characters"), "Short reason (< 5 chars) rejected");
  assert(store.complaints[0].isDeleted === false, "Complaint remains active after invalid attempt");

  // Valid soft delete
  const validDeleteRes = store.softDelete(admin, 101, "Abusive profanity violation");
  assert(validDeleteRes.success === true, "Valid soft delete succeeded");
  assert(store.complaints[0].isDeleted === true, "isDeleted flag is now true");
  assert(store.complaints[0].deletedBy === "super_admin", "deletedBy correctly recorded");
  assert(store.complaints[0].deletedReason === "Abusive profanity violation", "deletedReason preserved");
  assert(Boolean(store.complaints[0].deletedAt), "deletedAt timestamp set");

  console.log("\n── 2. Complaint Restoration ───────────────────────────────────");
  const restoreRes = store.restore(admin, 101);
  assert(restoreRes.success === true, "Restoration succeeded");
  assert(store.complaints[0].isDeleted === false, "isDeleted reset to false");
  assert(store.complaints[0].deletedBy === null, "deletedBy cleared");
  assert(store.complaints[0].deletedReason === null, "deletedReason cleared");
  assert(store.complaints[0].deletedAt === null, "deletedAt cleared");

  console.log("\n── 3. Active Lockout Clearance ────────────────────────────────");
  const future = new Date(Date.now() + 15 * 60 * 1000);
  store.lockouts.push({
    id: 1,
    keyType: "roll_number",
    keyValue: "240101002",
    lockedUntil: future,
    reason: "5 failed logins",
  });
  store.lockouts.push({
    id: 2,
    keyType: "ip",
    keyValue: "192.168.1.50",
    lockedUntil: future,
    reason: "5 failed logins",
  });

  assert(store.lockouts.length === 2, "2 active lockouts in store");

  // Non-admin clear rejected
  const unauthClear = store.clearLockout(boarder, 1);
  assert(unauthClear.error?.includes("Unauthorized"), "Non-admin blocked from clearing lockouts");

  // Admin clears roll number lockout
  const clearRes = store.clearLockout(admin, 1);
  assert(clearRes.success === true, "Lockout cleared successfully");
  assert(store.lockouts.length === 1, "Remaining lockouts count is 1");
  assert(store.lockouts[0].id === 2, "IP lockout remains active");

  console.log("\n── 4. Audit Logging Trail ─────────────────────────────────────");
  assert(store.auditLogs.some((l) => l.action === "soft_delete_complaint"), "Audit logged soft_delete_complaint");
  assert(store.auditLogs.some((l) => l.action === "restore_complaint"), "Audit logged restore_complaint");
  assert(store.auditLogs.some((l) => l.action === "clear_lockout"), "Audit logged clear_lockout");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME MODERATION & LOCKOUT TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL MODERATION & LOCKOUT TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
