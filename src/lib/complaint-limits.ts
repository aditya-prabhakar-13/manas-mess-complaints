/**
 * Postgres-backed anti-abuse and rate limiting rules for complaint submissions.
 * No Redis required — all counters and duplicate checks live in Postgres.
 *
 * Rate Limits:
 *   - Per-meal limit: Max 3 complaints for a meal today per student
 *   - Daily student limit: Max 6 complaints across all meals today per student
 *   - Daily IP limit: Max 40 submissions across all students today per IP
 *   - 24-hour duplicate: Rejects identical text submitted by the same student within 24h
 */
import { db } from "@/db";
import { complaints, submissionLog } from "@/db/schema";
import { and, eq, gte, lte, sql, count } from "drizzle-orm";
import { getISTDayBounds } from "@/lib/date-utils";

export const MAX_COMPLAINTS_PER_MEAL = 3;
export const MAX_COMPLAINTS_PER_DAY_STUDENT = 6;
export const MAX_COMPLAINTS_PER_DAY_IP = 40;
export const DUPLICATE_WINDOW_HOURS = 24;

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  gala_dinner: "Gala Dinner",
};

export interface LimitCheckResult {
  allowed: boolean;
  count?: number;
  error?: string;
}

/**
 * 1. Per-Meal Daily Limit: Max 3 complaints per meal today for this student.
 */
export async function checkMealRateLimit(
  studentId: number,
  meal: string,
  referenceDate: Date = new Date()
): Promise<LimitCheckResult> {
  const { startOfDay, endOfDay } = getISTDayBounds(referenceDate);

  const [res] = await db
    .select({ count: count() })
    .from(complaints)
    .where(
      and(
        eq(complaints.studentId, studentId),
        eq(complaints.meal, meal),
        eq(complaints.isDeleted, false),
        gte(complaints.createdAt, startOfDay),
        lte(complaints.createdAt, endOfDay)
      )
    );

  const currentCount = res?.count ?? 0;
  if (currentCount >= MAX_COMPLAINTS_PER_MEAL) {
    const mealLabel = MEAL_LABELS[meal] ?? meal;
    return {
      allowed: false,
      count: currentCount,
      error: `You have reached the maximum of 3 complaints for ${mealLabel} today. Limit resets at midnight IST.`,
    };
  }

  return { allowed: true, count: currentCount };
}

/**
 * 2. Daily Student Limit: Max 6 complaints total across all meals today for this student.
 */
export async function checkDailyStudentRateLimit(
  studentId: number,
  referenceDate: Date = new Date()
): Promise<LimitCheckResult> {
  const { startOfDay, endOfDay } = getISTDayBounds(referenceDate);

  const [res] = await db
    .select({ count: count() })
    .from(complaints)
    .where(
      and(
        eq(complaints.studentId, studentId),
        eq(complaints.isDeleted, false),
        gte(complaints.createdAt, startOfDay),
        lte(complaints.createdAt, endOfDay)
      )
    );

  const currentCount = res?.count ?? 0;
  if (currentCount >= MAX_COMPLAINTS_PER_DAY_STUDENT) {
    return {
      allowed: false,
      count: currentCount,
      error: "Daily limit reached (max 6 complaints per day). Limit resets at midnight IST.",
    };
  }

  return { allowed: true, count: currentCount };
}

/**
 * 3. Daily IP Limit: Max 40 submissions from this IP address today.
 */
export async function checkDailyIPRateLimit(
  ip: string,
  referenceDate: Date = new Date()
): Promise<LimitCheckResult> {
  const { startOfDay, endOfDay } = getISTDayBounds(referenceDate);

  const [res] = await db
    .select({ count: count() })
    .from(submissionLog)
    .where(
      and(
        eq(submissionLog.ipAddress, ip),
        gte(submissionLog.attemptedAt, startOfDay),
        lte(submissionLog.attemptedAt, endOfDay)
      )
    );

  const currentCount = res?.count ?? 0;
  if (currentCount >= MAX_COMPLAINTS_PER_DAY_IP) {
    return {
      allowed: false,
      count: currentCount,
      error: "IP rate limit exceeded (max 40 submissions per day). Please try again tomorrow.",
    };
  }

  return { allowed: true, count: currentCount };
}

/**
 * 4. 24-Hour Duplicate Content Check: Rejects identical trimmed complaint text
 * submitted by the same student within the last 24 hours.
 */
export async function checkDuplicateContent(
  studentId: number,
  text: string,
  referenceDate: Date = new Date()
): Promise<{ isDuplicate: boolean; error?: string }> {
  const windowStart = new Date(
    referenceDate.getTime() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000
  );
  const normalizedText = text.trim().toLowerCase();

  const [res] = await db
    .select({ count: count() })
    .from(complaints)
    .where(
      and(
        eq(complaints.studentId, studentId),
        eq(complaints.isDeleted, false),
        gte(complaints.createdAt, windowStart),
        eq(sql`LOWER(TRIM(${complaints.complaintText}))`, normalizedText)
      )
    );

  const countMatches = res?.count ?? 0;
  if (countMatches > 0) {
    return {
      isDuplicate: true,
      error: "Duplicate submission. You have already submitted an identical complaint within the last 24 hours.",
    };
  }

  return { isDuplicate: false };
}

/**
 * Record submission attempt outcome in `submission_log`.
 */
export async function recordSubmissionAttempt(
  rollNumber: string,
  ip: string,
  userAgent: string | null,
  outcome: string,
  meal?: string
): Promise<void> {
  await db.insert(submissionLog).values({
    rollNumber: rollNumber.toUpperCase(),
    ipAddress: ip,
    userAgent: userAgent ?? "",
    outcome,
    meal: meal ?? null,
  });
}
