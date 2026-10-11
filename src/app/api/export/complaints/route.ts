import { NextRequest, NextResponse } from "next/server";
import { getSmcSession, getAdminSession, COOKIE_SMC, COOKIE_ADMIN } from "@/lib/auth";
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { and, eq, gte, lte, lt, desc } from "drizzle-orm";
import {
  getActiveFeedCutoffDate,
  formatISTDateTime,
} from "@/lib/date-utils";
import { MEAL_LABELS } from "@/lib/complaint-limits";
import type { FormattedComplaint } from "@/lib/complaints-query";
import {
  buildComplaintsExcel,
  buildComplaintsPDF,
} from "@/lib/export-builders";

export const dynamic = "force-dynamic";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // 1. Authenticate caller (SMC or Admin)
  const smcToken = request.cookies.get(COOKIE_SMC)?.value;
  const adminToken = request.cookies.get(COOKIE_ADMIN)?.value;
  const smcSession = await getSmcSession(smcToken);
  const adminSession = await getAdminSession(adminToken);

  if (!smcSession && !adminSession) {
    return NextResponse.json(
      { error: "Unauthorized. SMC or Admin session required." },
      { status: 401 }
    );
  }

  // 2. Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  const view = (searchParams.get("view") || "active").toLowerCase();
  const month = searchParams.get("month") || undefined;
  const meal = (searchParams.get("meal") || "all").toLowerCase();

  // 3. Build database query conditions
  const cutoffDate = getActiveFeedCutoffDate();
  const conditions = [eq(complaints.isDeleted, false)];

  if (view === "archive") {
    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);

      const startOfMonthUTC =
        Date.UTC(year, m - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS;
      const daysInMonth = new Date(year, m, 0).getDate();
      const endOfMonthUTC =
        Date.UTC(year, m - 1, daysInMonth, 23, 59, 59, 999) - IST_OFFSET_MS;

      const startOfRange = new Date(startOfMonthUTC);
      const endOfRange = new Date(
        Math.min(endOfMonthUTC, cutoffDate.getTime())
      );

      conditions.push(gte(complaints.createdAt, startOfRange));
      conditions.push(lte(complaints.createdAt, endOfRange));
    } else {
      conditions.push(lt(complaints.createdAt, cutoffDate));
    }
  } else {
    // Default active feed
    conditions.push(gte(complaints.createdAt, cutoffDate));
  }

  if (meal && meal !== "all") {
    conditions.push(eq(complaints.meal, meal));
  }

  // 4. Query matching records (no pagination, full export)
  const rows = await db
    .select()
    .from(complaints)
    .where(and(...conditions))
    .orderBy(desc(complaints.createdAt));

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

  // 5. Generate file buffer based on requested format
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeMonth = month ? `-${month}` : "";

  if (format === "pdf") {
    const filename = `manas-complaints-${view}${safeMonth}-${timestamp}.pdf`;
    const buffer = await buildComplaintsPDF(formatted, {
      view,
      meal,
      month,
      generatedAt: new Date(),
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  // Default: xlsx
  const filename = `manas-complaints-${view}${safeMonth}-${timestamp}.xlsx`;
  const buffer = buildComplaintsExcel(formatted, {
    view,
    meal,
    month,
    generatedAt: new Date(),
  });

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
