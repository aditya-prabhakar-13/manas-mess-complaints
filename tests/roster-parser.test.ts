/**
 * Unit & Integration tests for Roster File Parser & Delta Calculator.
 * Run: npx tsx tests/roster-parser.test.ts
 */
import * as XLSX from "xlsx";
import {
  parseRosterFile,
  calculateRosterDelta,
} from "../src/lib/roster-parser";
import type { Student } from "../src/db/schema";

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

async function runTests() {
  console.log("\n── 1. CSV Parsing with Standard Headers ───────────────────────");
  const csvContent = `roll_number,name,block,room_number,course,year_of_joining
240101001,Aarav Sharma,A,214,B.Tech CSE,2024
240101002,Priya Patel,B,108,B.Tech ECE,2023
240101003,Rohan Verma,C,302,B.Tech ME,2022`;

  const csvBuffer = Buffer.from(csvContent, "utf-8");
  const parsedCsv = parseRosterFile(csvBuffer);

  assert(parsedCsv.errors.length === 0, "CSV parses with 0 errors");
  assert(parsedCsv.rows.length === 3, "Parsed 3 valid rows from CSV");
  assert(parsedCsv.rows[0].rollNumber === "240101001", "Row 1 roll number matches");
  assert(parsedCsv.rows[0].block === "A", "Row 1 block is 'A'");
  assert(parsedCsv.rows[0].yearOfJoining === 2024, "Row 1 year of joining is 2024");

  console.log("\n── 2. XLSX Parsing with Alternate Casing & Headers ────────────");
  const xlsxData = [
    {
      "Roll No": "240101010",
      "Student Name": "Ananya Roy",
      "Hostel Block": "d",
      "Room": "115",
      "Branch": "B.Tech Civil",
      "Joining Year": 2024,
    },
    {
      "Roll No": "240101020",
      "Student Name": "Vikram Singh",
      "Hostel Block": "B",
      "Room": "220",
      "Branch": "B.Tech ME",
      "Joining Year": 2021,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(xlsxData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const xlsxBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  const parsedXlsx = parseRosterFile(xlsxBuffer);
  assert(parsedXlsx.errors.length === 0, "XLSX parses with 0 errors");
  assert(parsedXlsx.rows.length === 2, "Parsed 2 valid rows from XLSX");
  assert(parsedXlsx.rows[0].rollNumber === "240101010", "Row 1 roll number matches");
  assert(parsedXlsx.rows[0].block === "D", "Lower-cased block 'd' normalized to 'D'");
  assert(parsedXlsx.rows[0].course === "B.Tech Civil", "Branch mapped to course");
  assert(parsedXlsx.rows[0].yearOfJoining === 2024, "Joining year mapped correctly");

  console.log("\n── 3. Validation: Invalid Blocks & Duplicate Roll Numbers ─────");
  const badCsv = `roll,name,block,room,course,year
240101001,Student One,A,101,B.Tech,2024
240101002,Student Two,E,102,B.Tech,2024
240101001,Student Duplicate,B,103,B.Tech,2024
,Student No Roll,C,104,B.Tech,2024`;

  const badResult = parseRosterFile(Buffer.from(badCsv, "utf-8"));
  assert(badResult.rows.length === 1, "Only 1 valid row accepted");
  assert(badResult.errors.length === 3, "Flagged exactly 3 errors");
  assert(
    badResult.errors.some((e) => e.includes("Invalid block 'E'")),
    "Invalid block 'E' rejected with error"
  );
  assert(
    badResult.errors.some((e) => e.includes("Duplicate roll number '240101001'")),
    "Duplicate roll number rejected with error"
  );
  assert(
    badResult.errors.some((e) => e.includes("Roll Number is missing")),
    "Missing roll number rejected with error"
  );

  console.log("\n── 4. Roster Delta Calculation ────────────────────────────────");
  const existingStudents: Student[] = [
    {
      id: 1,
      rollNumber: "240101001",
      name: "Aarav Sharma",
      block: "A",
      roomNumber: "214",
      course: "B.Tech CSE",
      yearOfJoining: 2024,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      rollNumber: "240101002",
      name: "Priya Patel",
      block: "B",
      roomNumber: "108",
      course: "B.Tech ECE",
      yearOfJoining: 2023,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      rollNumber: "240101099",
      name: "Graduated Student",
      block: "C",
      roomNumber: "401",
      course: "B.Tech",
      yearOfJoining: 2020,
      isActive: true, // Should be deactivated as missing in upload
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const uploadBatch = [
    // Unchanged student
    {
      rollNumber: "240101001",
      name: "Aarav Sharma",
      block: "A" as const,
      roomNumber: "214",
      course: "B.Tech CSE",
      yearOfJoining: 2024,
    },
    // Updated student (room changed from 108 to 110)
    {
      rollNumber: "240101002",
      name: "Priya Patel",
      block: "B" as const,
      roomNumber: "110",
      course: "B.Tech ECE",
      yearOfJoining: 2023,
    },
    // Brand new student
    {
      rollNumber: "240101003",
      name: "Rohan Verma",
      block: "C" as const,
      roomNumber: "302",
      course: "B.Tech ME",
      yearOfJoining: 2022,
    },
  ];

  const delta = calculateRosterDelta(uploadBatch, existingStudents);
  assert(delta.toInsert.length === 1, "Delta detects 1 student to insert");
  assert(delta.toInsert[0].rollNumber === "240101003", "toInsert roll is 240101003");
  assert(delta.toUpdate.length === 1, "Delta detects 1 student to update");
  assert(delta.toUpdate[0].roomNumber === "110", "toUpdate has new room number 110");
  assert(delta.toDeactivate.length === 1, "Delta detects 1 student to deactivate");
  assert(delta.toDeactivate[0].rollNumber === "240101099", "toDeactivate is Graduated Student (missing from upload)");
  assert(delta.unchangedCount === 1, "Delta counts 1 unchanged student");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ROSTER PARSER TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ROSTER PARSER TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
