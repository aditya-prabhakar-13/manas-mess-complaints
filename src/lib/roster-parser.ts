/**
 * Roster File Parser & Delta Calculator.
 * Parses CSV and XLSX files using SheetJS and validates student record integrity.
 */
import * as XLSX from "xlsx";
import type { Student } from "@/db/schema";

export interface ParsedStudentRecord {
  rollNumber: string;
  name: string;
  block: "A" | "B" | "C" | "D";
  roomNumber: string;
  course: string;
  yearOfJoining: number;
}

export interface RosterParseResult {
  rows: ParsedStudentRecord[];
  errors: string[];
  warnings: string[];
}

export interface RosterDelta {
  toInsert: ParsedStudentRecord[];
  toUpdate: ParsedStudentRecord[];
  toDeactivate: Student[];
  unchangedCount: number;
}

const VALID_BLOCKS = new Set(["A", "B", "C", "D"]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Parses a CSV or XLSX buffer and validates row contents.
 */
export function parseRosterFile(buffer: Buffer): RosterParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validRows: ParsedStudentRecord[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    return {
      rows: [],
      errors: [`Failed to read file as spreadsheet: ${(err as Error).message}`],
      warnings: [],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      errors: ["Spreadsheet contains no worksheets."],
      warnings: [],
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  if (rawRows.length === 0) {
    return {
      rows: [],
      errors: ["Worksheet is empty."],
      warnings: [],
    };
  }

  const seenRolls = new Set<string>();
  const currentYear = new Date().getFullYear();

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNum = idx + 2; // 1-indexed header is row 1

    // Map keys
    let rollNumber = "";
    let name = "";
    let block = "";
    let roomNumber = "";
    let course = "";
    let yearOfJoining = 0;

    for (const [k, val] of Object.entries(raw)) {
      const normalized = normalizeKey(k);
      const strVal = String(val ?? "").trim();

      if (
        normalized === "rollnumber" ||
        normalized === "roll" ||
        normalized === "rollno"
      ) {
        rollNumber = strVal.toUpperCase();
      } else if (
        normalized === "name" ||
        normalized === "studentname" ||
        normalized === "fullname"
      ) {
        name = strVal;
      } else if (normalized === "block" || normalized === "hostelblock") {
        block = strVal.toUpperCase();
      } else if (
        normalized === "roomnumber" ||
        normalized === "room" ||
        normalized === "roomno"
      ) {
        roomNumber = strVal;
      } else if (
        normalized === "course" ||
        normalized === "branch" ||
        normalized === "department" ||
        normalized === "program"
      ) {
        course = strVal;
      } else if (
        normalized === "yearofjoining" ||
        normalized === "joiningyear" ||
        normalized === "year" ||
        normalized === "batch"
      ) {
        const parsedYear = parseInt(strVal, 10);
        if (!isNaN(parsedYear)) {
          yearOfJoining = parsedYear;
        }
      }
    }

    // Row validations
    if (!rollNumber) {
      errors.push(`Row ${rowNum}: Roll Number is missing or empty.`);
      continue;
    }

    if (seenRolls.has(rollNumber)) {
      errors.push(
        `Row ${rowNum}: Duplicate roll number '${rollNumber}' detected in file.`
      );
      continue;
    }
    seenRolls.add(rollNumber);

    if (!name) {
      errors.push(`Row ${rowNum} (${rollNumber}): Name is missing.`);
      continue;
    }

    if (!VALID_BLOCKS.has(block)) {
      errors.push(
        `Row ${rowNum} (${rollNumber}): Invalid block '${block}'. Must be A, B, C, or D.`
      );
      continue;
    }

    if (!roomNumber) {
      errors.push(`Row ${rowNum} (${rollNumber}): Room number is missing.`);
      continue;
    }

    if (!course) {
      warnings.push(`Row ${rowNum} (${rollNumber}): Course missing, defaulting to 'B.Tech'.`);
      course = "B.Tech";
    }

    if (!yearOfJoining || yearOfJoining < 1990 || yearOfJoining > currentYear + 1) {
      errors.push(
        `Row ${rowNum} (${rollNumber}): Invalid year of joining '${yearOfJoining}'. Must be between 1990 and ${currentYear + 1}.`
      );
      continue;
    }

    validRows.push({
      rollNumber,
      name,
      block: block as "A" | "B" | "C" | "D",
      roomNumber,
      course,
      yearOfJoining,
    });
  }

  return {
    rows: validRows,
    errors,
    warnings,
  };
}

/**
 * Computes difference between uploaded roster and current database state.
 */
export function calculateRosterDelta(
  parsedRows: ParsedStudentRecord[],
  existingStudents: Student[]
): RosterDelta {
  const existingMap = new Map<string, Student>();
  for (const s of existingStudents) {
    existingMap.set(s.rollNumber.toUpperCase(), s);
  }

  const toInsert: ParsedStudentRecord[] = [];
  const toUpdate: ParsedStudentRecord[] = [];
  let unchangedCount = 0;

  const uploadedRolls = new Set<string>();

  for (const row of parsedRows) {
    uploadedRolls.add(row.rollNumber);
    const existing = existingMap.get(row.rollNumber);

    if (!existing) {
      toInsert.push(row);
    } else {
      const isDifferent =
        existing.name !== row.name ||
        existing.block !== row.block ||
        existing.roomNumber !== row.roomNumber ||
        existing.course !== row.course ||
        existing.yearOfJoining !== row.yearOfJoining ||
        !existing.isActive;

      if (isDifferent) {
        toUpdate.push(row);
      } else {
        unchangedCount++;
      }
    }
  }

  // Deactivate existing active students that are not present in upload
  const toDeactivate = existingStudents.filter(
    (s) => s.isActive && !uploadedRolls.has(s.rollNumber.toUpperCase())
  );

  return {
    toInsert,
    toUpdate,
    toDeactivate,
    unchangedCount,
  };
}
