"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { students, type Student } from "@/db/schema";
import { eq, notInArray } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import {
  parseRosterFile,
  calculateRosterDelta,
  type ParsedStudentRecord,
} from "@/lib/roster-parser";
import { recordAuditLog } from "@/lib/audit";

export interface RosterPreviewState {
  error?: string;
  success?: boolean;
  rows?: ParsedStudentRecord[];
  errors?: string[];
  warnings?: string[];
  delta?: {
    toInsertCount: number;
    toUpdateCount: number;
    toDeactivateCount: number;
    unchangedCount: number;
  };
}

export interface StudentActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Parses and previews an uploaded roster spreadsheet.
 */
export async function previewRosterAction(
  prevState: RosterPreviewState,
  formData: FormData
): Promise<RosterPreviewState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const file = formData.get("rosterFile") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please select a valid CSV or XLSX file." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseResult = parseRosterFile(buffer);
    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      return {
        error: "File parsing failed.",
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    }

    const existingStudents = await db.select().from(students);
    const delta = calculateRosterDelta(parseResult.rows, existingStudents);

    return {
      success: true,
      rows: parseResult.rows,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      delta: {
        toInsertCount: delta.toInsert.length,
        toUpdateCount: delta.toUpdate.length,
        toDeactivateCount: delta.toDeactivate.length,
        unchangedCount: delta.unchangedCount,
      },
    };
  } catch (err) {
    return { error: `Failed to process file: ${(err as Error).message}` };
  }
}

/**
 * Commits verified roster records into the database.
 */
export async function commitRosterAction(
  rowsJson: string
): Promise<StudentActionState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  let parsedRows: ParsedStudentRecord[] = [];
  try {
    parsedRows = JSON.parse(rowsJson);
  } catch {
    return { error: "Invalid roster payload." };
  }

  if (parsedRows.length === 0) {
    return { error: "No records to commit." };
  }

  try {
    const existingStudents = await db.select().from(students);
    const delta = calculateRosterDelta(parsedRows, existingStudents);

    // 1. Upsert uploaded students
    for (const row of parsedRows) {
      await db
        .insert(students)
        .values({
          rollNumber: row.rollNumber,
          name: row.name,
          block: row.block,
          roomNumber: row.roomNumber,
          course: row.course,
          yearOfJoining: row.yearOfJoining,
          isActive: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: students.rollNumber,
          set: {
            name: row.name,
            block: row.block,
            roomNumber: row.roomNumber,
            course: row.course,
            yearOfJoining: row.yearOfJoining,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }

    // 2. Mark missing students as inactive
    const uploadedRolls = parsedRows.map((r) => r.rollNumber);
    if (uploadedRolls.length > 0) {
      await db
        .update(students)
        .set({ isActive: false, updatedAt: new Date() })
        .where(notInArray(students.rollNumber, uploadedRolls));
    }

    // 3. Record audit entry
    await recordAuditLog({
      actorId: session.username,
      action: "commit_roster_update",
      targetType: "roster",
      details: {
        totalRows: parsedRows.length,
        inserted: delta.toInsert.length,
        updated: delta.toUpdate.length,
        deactivated: delta.toDeactivate.length,
      },
    });

    revalidatePath("/admin/roster");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Roster committed: ${delta.toInsert.length} added, ${delta.toUpdate.length} updated, ${delta.toDeactivate.length} deactivated.`,
    };
  } catch (err) {
    return { error: `Commit failed: ${(err as Error).message}` };
  }
}

/**
 * Updates an individual student record inline.
 */
export async function updateStudentAction(
  prevState: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const studentId = parseInt(formData.get("studentId")?.toString() ?? "0", 10);
  const name = formData.get("name")?.toString().trim() ?? "";
  const block = formData.get("block")?.toString().trim().toUpperCase() ?? "";
  const roomNumber = formData.get("roomNumber")?.toString().trim() ?? "";
  const course = formData.get("course")?.toString().trim() ?? "";
  const yearOfJoining = parseInt(
    formData.get("yearOfJoining")?.toString() ?? "0",
    10
  );
  const isActive = formData.get("isActive") === "true";

  if (!studentId || !name || !["A", "B", "C", "D"].includes(block) || !roomNumber) {
    return { error: "Invalid student details." };
  }

  try {
    await db
      .update(students)
      .set({
        name,
        block: block as "A" | "B" | "C" | "D",
        roomNumber,
        course: course || "B.Tech",
        yearOfJoining: yearOfJoining || new Date().getFullYear(),
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));

    await recordAuditLog({
      actorId: session.username,
      action: "update_student",
      targetType: "student",
      targetId: studentId.toString(),
      details: { name, block, roomNumber, course, yearOfJoining, isActive },
    });

    revalidatePath("/admin/roster");
    return { success: true, message: "Student record updated." };
  } catch (err) {
    return { error: `Update failed: ${(err as Error).message}` };
  }
}
