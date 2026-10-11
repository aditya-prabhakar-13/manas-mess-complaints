/**
 * Unit & Integration tests for Serverless Excel & PDF Export Builders.
 * Run: npx tsx tests/export.test.ts
 */
import * as XLSX from "xlsx";
import {
  buildComplaintsExcel,
  buildComplaintsPDF,
} from "../src/lib/export-builders";
import type { FormattedComplaint } from "../src/lib/complaints-query";

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

const mockComplaints: FormattedComplaint[] = [
  {
    id: 101,
    rollNumber: "240101001",
    nameSnapshot: "Aarav Sharma",
    courseSnapshot: "B.Tech CSE",
    yearOfStudySnapshot: "3rd Year",
    blockRoomSnapshot: "A-214",
    meal: "breakfast",
    mealLabel: "Breakfast",
    complaintText: "Puri was excessively oily and cold.",
    createdAt: new Date("2026-10-10T08:30:00.000Z"),
    formattedTime: "10 Oct 2026, 02:00 PM",
  },
  {
    id: 102,
    rollNumber: "240101002",
    nameSnapshot: "Priya Patel",
    courseSnapshot: "B.Tech ECE",
    yearOfStudySnapshot: "2nd Year",
    blockRoomSnapshot: "B-108",
    meal: "lunch",
    mealLabel: "Lunch",
    complaintText: "Dal was watery and salt was missing in paneer sabzi.",
    createdAt: new Date("2026-10-10T13:15:00.000Z"),
    formattedTime: "10 Oct 2026, 06:45 PM",
  },
];

async function runTests() {
  console.log("\n── 1. Excel (.xlsx) Export Builder ────────────────────────────");
  const excelBuffer = buildComplaintsExcel(mockComplaints, {
    view: "active",
    meal: "all",
  });

  assert(Buffer.isBuffer(excelBuffer), "Returns a valid Node.js Buffer");
  assert(excelBuffer.length > 500, "Buffer contains non-trivial data (>500 bytes)");

  // Check ZIP/OOXML magic numbers (50 4B 03 04)
  const isZip =
    excelBuffer[0] === 0x50 &&
    excelBuffer[1] === 0x4b &&
    excelBuffer[2] === 0x03 &&
    excelBuffer[3] === 0x04;
  assert(isZip, "Excel buffer has valid PK zip signature (0x50 0x4B 0x03 0x04)");

  // Read back with SheetJS to verify structure and content
  const workbook = XLSX.read(excelBuffer, { type: "buffer" });
  assert(workbook.SheetNames.length >= 1, "Workbook contains at least 1 worksheet");
  assert(workbook.SheetNames[0] === "Active", "Worksheet title is 'Active'");

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  assert(parsedRows.length === 2, "Worksheet contains exactly 2 rows");

  const row1 = parsedRows[0];
  assert(row1["ID"] === 101, "Row 1 ID matches (101)");
  assert(row1["Roll Number"] === "240101001", "Row 1 Roll Number matches");
  assert(row1["Name"] === "Aarav Sharma", "Row 1 Name snapshot matches");
  assert(row1["Block & Room"] === "A-214", "Row 1 Block & Room matches");
  assert(row1["Meal"] === "Breakfast", "Row 1 Meal label matches");
  assert(row1["Complaint Text"] === "Puri was excessively oily and cold.", "Row 1 Complaint Text matches");

  console.log("\n── 2. Excel Archive Scope Worksheet Title ─────────────────────");
  const archiveExcel = buildComplaintsExcel(mockComplaints, {
    view: "archive",
    meal: "lunch",
    month: "2026-09",
  });
  const archiveWb = XLSX.read(archiveExcel, { type: "buffer" });
  assert(archiveWb.SheetNames[0] === "Archive-2026-09", "Archive worksheet title is 'Archive-2026-09'");

  console.log("\n── 3. PDF (.pdf) Export Builder ───────────────────────────────");
  const pdfBuffer = await buildComplaintsPDF(mockComplaints, {
    view: "active",
    meal: "all",
  });

  assert(Buffer.isBuffer(pdfBuffer), "PDF builder returns a valid Node.js Buffer");
  assert(pdfBuffer.length > 1000, "PDF buffer contains non-trivial data (>1000 bytes)");

  // Check PDF signature (%PDF-)
  const pdfHeader = pdfBuffer.subarray(0, 5).toString("ascii");
  assert(pdfHeader === "%PDF-", "PDF buffer starts with '%PDF-' magic header");

  // Check PDF footer (%%EOF)
  const pdfFooter = pdfBuffer.subarray(pdfBuffer.length - 20).toString("ascii");
  assert(pdfFooter.includes("%%EOF"), "PDF buffer terminates cleanly with '%%EOF'");

  console.log("\n── 4. Empty Set Handling ──────────────────────────────────────");
  const emptyExcel = buildComplaintsExcel([], { view: "active", meal: "dinner" });
  assert(Buffer.isBuffer(emptyExcel), "Empty complaints list generates valid Excel buffer");

  const emptyPdf = await buildComplaintsPDF([], { view: "active", meal: "dinner" });
  assert(Buffer.isBuffer(emptyPdf), "Empty complaints list generates valid PDF buffer");
  assert(emptyPdf.subarray(0, 5).toString("ascii") === "%PDF-", "Empty PDF has '%PDF-' header");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME EXPORT TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL EXPORT BUILDER TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
