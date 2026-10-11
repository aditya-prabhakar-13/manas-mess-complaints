"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { students, complaints, galaDates } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getBoarderSession } from "@/lib/auth";
import { formatISTDate, computeYearOfStudy } from "@/lib/date-utils";
import {
  checkMealRateLimit,
  checkDailyStudentRateLimit,
  checkDailyIPRateLimit,
  checkDuplicateContent,
  recordSubmissionAttempt,
} from "@/lib/complaint-limits";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const ComplaintInputSchema = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "gala_dinner"], {
    errorMap: () => ({ message: "Please select a valid meal option." }),
  }),
  text: z
    .string()
    .trim()
    .min(10, "Complaint must be at least 10 characters.")
    .max(2000, "Complaint must not exceed 2000 characters."),
});

export interface ComplaintFormState {
  error?: string;
  fieldErrors?: {
    meal?: string;
    text?: string;
  };
  success?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT IP & USER AGENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getClientIP(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown"
  );
}

async function getUserAgent(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("user-agent") ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION: submitComplaintAction
// ─────────────────────────────────────────────────────────────────────────────
export async function submitComplaintAction(
  prevState: ComplaintFormState,
  formData: FormData
): Promise<ComplaintFormState> {
  // 1. Session check
  const session = await getBoarderSession();
  if (!session) {
    return { error: "Your session has expired. Please log in again." };
  }

  const ip = await getClientIP();
  const userAgent = await getUserAgent();

  // 2. Honeypot anti-spam trap
  const honeypot = formData.get("website");
  if (honeypot && String(honeypot).trim().length > 0) {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "honeypot"
    );
    // Generic rejection to avoid alerting the bot
    return { error: "Submission rejected." };
  }

  // 3. Input validation
  const mealRaw = formData.get("meal");
  const textRaw = formData.get("text");

  const parsed = ComplaintInputSchema.safeParse({
    meal: mealRaw,
    text: textRaw,
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const firstErrorMessage =
      flattened.text?.[0] || flattened.meal?.[0] || "Invalid submission data.";
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "validation_error",
      typeof mealRaw === "string" ? mealRaw : undefined
    );
    return {
      error: firstErrorMessage,
      fieldErrors: {
        meal: flattened.meal?.[0],
        text: flattened.text?.[0],
      },
    };
  }

  const { meal, text } = parsed.data;

  // 4. Gala Dinner dynamic date verification
  const todayIST = formatISTDate(new Date());
  const [galaEntry] = await db
    .select({ galaDate: galaDates.galaDate })
    .from(galaDates)
    .where(eq(galaDates.galaDate, todayIST))
    .limit(1);

  const isGalaToday = !!galaEntry;

  if (isGalaToday && meal === "dinner") {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "gala_validation_error",
      meal
    );
    return {
      error:
        "Today is a Gala Dinner date. Dinner has been replaced by Gala Dinner. Please select Gala Dinner.",
    };
  }

  if (!isGalaToday && meal === "gala_dinner") {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "gala_validation_error",
      meal
    );
    return {
      error: "Gala Dinner is not scheduled for today.",
    };
  }

  // 5. 24-Hour Duplicate Content Check
  const duplicateCheck = await checkDuplicateContent(session.studentId, text);
  if (duplicateCheck.isDuplicate) {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "duplicate",
      meal
    );
    return { error: duplicateCheck.error };
  }

  // 6. Daily IP Rate Limit Check (Max 40/day)
  const ipCheck = await checkDailyIPRateLimit(ip);
  if (!ipCheck.allowed) {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "rate_limit_ip",
      meal
    );
    return { error: ipCheck.error };
  }

  // 7. Daily Student Rate Limit Check (Max 6/day)
  const studentDailyCheck = await checkDailyStudentRateLimit(session.studentId);
  if (!studentDailyCheck.allowed) {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "rate_limit_day",
      meal
    );
    return { error: studentDailyCheck.error };
  }

  // 8. Per-Meal Daily Rate Limit Check (Max 3/meal/day)
  const mealCheck = await checkMealRateLimit(session.studentId, meal);
  if (!mealCheck.allowed) {
    await recordSubmissionAttempt(
      session.rollNumber,
      ip,
      userAgent,
      "rate_limit_meal",
      meal
    );
    return { error: mealCheck.error };
  }

  // 9. Fetch current active student record for immutable snapshot
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, session.studentId), eq(students.isActive, true)))
    .limit(1);

  if (!student) {
    return {
      error: "Student record is no longer active in roster. Please contact SMC.",
    };
  }

  const { label: yearLabel } = computeYearOfStudy(student.yearOfJoining);
  const blockRoomSnapshot = `${student.block}-${student.roomNumber}`;

  // 10. Persist immutable complaint snapshot
  await db.insert(complaints).values({
    studentId: student.id,
    rollNumber: student.rollNumber,
    nameSnapshot: student.name,
    courseSnapshot: student.course,
    yearOfStudySnapshot: yearLabel,
    blockRoomSnapshot,
    meal,
    complaintText: text,
  });

  // 11. Record successful attempt in submission log
  await recordSubmissionAttempt(
    session.rollNumber,
    ip,
    userAgent,
    "success",
    meal
  );

  // 12. Redirect to confirmation screen
  redirect("/done");
}
