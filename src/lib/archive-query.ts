/**
 * SMC Complaints Query Engine for Archive View.
 * Handles query-time archival categorization and grouping by Month-Year.
 */
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { and, eq, lt, gte, lte, desc, count } from "drizzle-orm";
import {
  getActiveFeedCutoffDate,
  formatISTDateTime,
  formatISTMonthYear,
} from "@/lib/date-utils";
import { MEAL_LABELS } from "@/lib/complaint-limits";
import type { FormattedComplaint } from "./complaints-query";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface ArchivedMonthInfo {
  monthKey: string; // e.g. "2026-09"
  label: string;    // e.g. "September 2026"
  count: number;
}

export interface ArchivedComplaintsResult {
  complaints: FormattedComplaint[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  monthKey: string;
  monthLabel: string;
}

/**
 * Returns a list of all distinct Month-Year buckets present in the archive,
 * sorted descending (newest month first).
 */
export async function getArchivedMonths(
  referenceNow?: Date
): Promise<ArchivedMonthInfo[]> {
  const cutoffDate = getActiveFeedCutoffDate(referenceNow);

  // Fetch all archived complaints timestamps
  const rows = await db
    .select({ createdAt: complaints.createdAt })
    .from(complaints)
    .where(
      and(eq(complaints.isDeleted, false), lt(complaints.createdAt, cutoffDate))
    )
    .orderBy(desc(complaints.createdAt));

  const monthMap = new Map<string, { label: string; count: number }>();

  for (const r of rows) {
    const d = new Date(r.createdAt.getTime() + IST_OFFSET_MS);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${month}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        label: formatISTMonthYear(r.createdAt),
        count: 1,
      });
    } else {
      const entry = monthMap.get(monthKey)!;
      entry.count++;
    }
  }

  return Array.from(monthMap.entries()).map(([monthKey, val]) => ({
    monthKey,
    label: val.label,
    count: val.count,
  }));
}

/**
 * Returns paginated complaints for a specific archived month.
 */
export async function getArchivedComplaints(options: {
  monthKey?: string;
  meal?: string;
  page?: number;
  pageSize?: number;
  referenceNow?: Date;
}): Promise<ArchivedComplaintsResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 25);
  const offset = (page - 1) * pageSize;
  const cutoffDate = getActiveFeedCutoffDate(options.referenceNow);

  // If no monthKey provided, find the most recent archived month
  let targetMonthKey = options.monthKey;
  if (!targetMonthKey) {
    const available = await getArchivedMonths(options.referenceNow);
    if (available.length > 0) {
      targetMonthKey = available[0].monthKey;
    } else {
      return {
        complaints: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
        monthKey: "",
        monthLabel: "No Archive Data",
      };
    }
  }

  // Parse targetMonthKey (YYYY-MM)
  const [yearStr, monthStr] = targetMonthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startOfMonthUTC =
    Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonthUTC =
    Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999) - IST_OFFSET_MS;

  const startOfRange = new Date(startOfMonthUTC);
  // Upper bound must not exceed cutoff date
  const endOfRange = new Date(Math.min(endOfMonthUTC, cutoffDate.getTime()));

  // Build where conditions
  const conditions = [
    eq(complaints.isDeleted, false),
    gte(complaints.createdAt, startOfRange),
    lte(complaints.createdAt, endOfRange),
  ];

  if (options.meal && options.meal !== "all") {
    conditions.push(eq(complaints.meal, options.meal.toLowerCase()));
  }

  const whereClause = and(...conditions);

  // 1. Total count
  const [countResult] = await db
    .select({ count: count() })
    .from(complaints)
    .where(whereClause);

  const total = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 2. Paginated rows
  const rows = await db
    .select()
    .from(complaints)
    .where(whereClause)
    .orderBy(desc(complaints.createdAt))
    .limit(pageSize)
    .offset(offset);

  const formatted: FormattedComplaint[] = rows.map((r) => ({
    id: r.id,
    rollNumber: r.rollNumber,
    nameSnapshot: r.nameSnapshot,
    courseSnapshot: r.courseSnapshot,
    yearOfStudySnapshot: r.yearOfStudySnapshot,
    blockRoomSnapshot: r.blockRoomSnapshot,
    meal: r.meal,
    mealLabel: MEAL_LABELS[r.meal] ?? r.meal,
    complaintText: r.complaintText,
    createdAt: r.createdAt,
    formattedTime: formatISTDateTime(r.createdAt),
  }));

  const monthLabel = formatISTMonthYear(startOfRange);

  return {
    complaints: formatted,
    total,
    page,
    pageSize,
    totalPages,
    monthKey: targetMonthKey,
    monthLabel,
  };
}
