/**
 * Unit & Integration tests for Administrative Export Builders and Route Handler.
 * Run: npx tsx tests/admin-export.test.ts
 */
import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import {
  buildRosterExcel,
  buildRosterPDF,
  buildAuditExcel,
  buildAuditPDF,
  buildSecurityLogsExcel,
  buildSecurityLogsPDF,
  type ExportStudent,
  type ExportAuditLog,
  type ExportLoginAttempt,
  type ExportSubmissionLog,
} from "../src/lib/export-builders";
import { GET } from "../src/app/api/admin/export/route";

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

const mockStudents: ExportStudent[] = [
  {
    rollNumber: "240101001",
    name: "Aarav Sharma",
    block: "A",
    roomNumber: "214",
    course: "B.Tech CSE",
    yearOfJoining: 2024,
    isActive: true,
    updatedAt: new Date("2026-10-10T08:30:00.000Z"),
  },
  {
    rollNumber: "240101002",
    name: "Rohan Verma",
    block: "B",
    roomNumber: "108",
    course: "B.Tech ME",
    yearOfJoining: 2023,
    isActive: false,
    updatedAt: new Date("2026-10-11T09:00:00.000Z"),
  },
];

const mockAuditLogs: ExportAuditLog[] = [
  {
    id: 1,
    actorId: "admin (admin)",
    action: "create_smc_account",
    targetType: "smc_user",
    targetId: "smc_mess_rep",
    details: JSON.stringify({ role: "mess_committee" }),
    createdAt: new Date("2026-10-11T10:00:00.000Z"),
  },
  {
    id: 2,
    actorId: "admin (admin)",
    action: "delete_complaint",
    targetType: "complaint",
    targetId: "105",
    details: "Inappropriate profanity",
    createdAt: new Date("2026-10-11T11:00:00.000Z"),
  },
];

const mockLogins: ExportLoginAttempt[] = [
  {
    id: 1,
    identifier: "240101001",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    outcome: "success",
    userType: "boarder",
    attemptedAt: new Date("2026-10-11T12:00:00.000Z"),
  },
];

const mockSubmissions: ExportSubmissionLog[] = [
  {
    id: 1,
    rollNumber: "240101001",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    meal: "lunch",
    outcome: "success",
    attemptedAt: new Date("2026-10-11T12:05:00.000Z"),
  },
];

async function runTests() {
  console.log("\n── 1. Roster Export Builders ──────────────────────────────────");
  const rosterExcel = buildRosterExcel(mockStudents);
  assert(Buffer.isBuffer(rosterExcel), "Roster Excel is a valid buffer");
  assert(
    rosterExcel[0] === 0x50 && rosterExcel[1] === 0x4b,
    "Roster Excel has PK zip signature"
  );

  const rosterWb = XLSX.read(rosterExcel, { type: "buffer" });
  assert(rosterWb.SheetNames[0] === "Roster", "Sheet name is 'Roster'");
  const rosterRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    rosterWb.Sheets["Roster"]
  );
  assert(rosterRows.length === 2, "Parsed 2 rows from Roster Excel");
  assert(rosterRows[0]["Roll Number"] === "240101001", "Row 1 Roll Number matches");
  assert(rosterRows[0]["Status"] === "Active", "Row 1 Status is Active");
  assert(rosterRows[1]["Status"] === "Inactive", "Row 2 Status is Inactive");

  const rosterPdf = await buildRosterPDF(mockStudents);
  assert(Buffer.isBuffer(rosterPdf), "Roster PDF is a valid buffer");
  assert(
    rosterPdf.subarray(0, 5).toString("ascii") === "%PDF-",
    "Roster PDF has %PDF- header"
  );
  assert(
    rosterPdf.subarray(rosterPdf.length - 20).toString("ascii").includes("%%EOF"),
    "Roster PDF terminates with %%EOF"
  );

  console.log("\n── 2. Audit Trail Export Builders ─────────────────────────────");
  const auditExcel = buildAuditExcel(mockAuditLogs);
  assert(Buffer.isBuffer(auditExcel), "Audit Excel is a valid buffer");
  const auditWb = XLSX.read(auditExcel, { type: "buffer" });
  assert(auditWb.SheetNames[0] === "Audit Trail", "Sheet name is 'Audit Trail'");
  const auditRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    auditWb.Sheets["Audit Trail"]
  );
  assert(auditRows.length === 2, "Parsed 2 rows from Audit Excel");
  assert(auditRows[0]["Action"] === "create_smc_account", "Row 1 Action matches");

  const auditPdf = await buildAuditPDF(mockAuditLogs);
  assert(Buffer.isBuffer(auditPdf), "Audit PDF is a valid buffer");
  assert(
    auditPdf.subarray(0, 5).toString("ascii") === "%PDF-",
    "Audit PDF has %PDF- header"
  );

  console.log("\n── 3. Security Logs Export Builders ───────────────────────────");
  const logsExcel = buildSecurityLogsExcel(mockLogins, mockSubmissions);
  assert(Buffer.isBuffer(logsExcel), "Security logs Excel is a valid buffer");
  const logsWb = XLSX.read(logsExcel, { type: "buffer" });
  assert(
    logsWb.SheetNames.includes("Login Attempts") &&
      logsWb.SheetNames.includes("Submissions"),
    "Contains both 'Login Attempts' and 'Submissions' sheets"
  );

  const logsPdf = await buildSecurityLogsPDF(mockLogins, mockSubmissions);
  assert(Buffer.isBuffer(logsPdf), "Security logs PDF is a valid buffer");
  assert(
    logsPdf.subarray(0, 5).toString("ascii") === "%PDF-",
    "Security logs PDF has %PDF- header"
  );

  console.log("\n── 4. Route Handler Authorization ─────────────────────────────");
  // Unauthorized request (no session cookies)
  const unauthReq = new NextRequest("http://localhost:3000/api/admin/export?type=roster");
  const unauthRes = await GET(unauthReq);
  assert(unauthRes.status === 401, "Unauthenticated request returns 401 Unauthorized");

  const unauthJson = await unauthRes.json();
  assert(
    unauthJson.error?.includes("Unauthorized"),
    "Error response clarifies admin session requirement"
  );

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ADMIN EXPORT TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ADMIN EXPORT TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
