/**
 * SMC Complaints Query Engine for Active Feed.
 * Evaluates active feed cutoff at query time (grace period: until 7th day 23:59:59 IST of M+1).
 */
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { and, eq, gte, desc, count } from "drizzle-orm";
import { getActiveFeedCutoffDate, formatISTDateTime } from "@/lib/date-utils";
import { MEAL_LABELS } from "@/lib/complaint-limits";

export interface FormattedComplaint {
  id: number;
  rollNumber: string;
  nameSnapshot: string;
  courseSnapshot: string;
  yearOfStudySnapshot: string;
  blockRoomSnapshot: string;
  meal: string;
  mealLabel: string;
  complaintText: string;
  createdAt: Date;
  formattedTime: string;
}

export interface ActiveComplaintsResult {
  complaints: FormattedComplaint[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getActiveComplaints(options: {
  meal?: string;
  page?: number;
  pageSize?: number;
  referenceNow?: Date;
}): Promise<ActiveComplaintsResult> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 25);
  const offset = (page - 1) * pageSize;
  const cutoffDate = getActiveFeedCutoffDate(options.referenceNow);

  // Build where conditions
  const conditions = [
    eq(complaints.isDeleted, false),
    gte(complaints.createdAt, cutoffDate),
  ];

  if (options.meal && options.meal !== "all") {
    conditions.push(eq(complaints.meal, options.meal.toLowerCase()));
  }

  const whereClause = and(...conditions);

  // 1. Get total matching count
  const [countResult] = await db
    .select({ count: count() })
    .from(complaints)
    .where(whereClause);

  const total = countResult?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 2. Query paginated complaints
  const rows = await db
    .select()
    .from(complaints)
    .where(whereClause)
    .orderBy(desc(complaints.createdAt))
    .limit(pageSize)
    .offset(offset);

  // 3. Format rows
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

  return {
    complaints: formatted,
    total,
    page,
    pageSize,
    totalPages,
  };
}
