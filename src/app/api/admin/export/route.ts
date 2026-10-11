import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, COOKIE_ADMIN } from "@/lib/auth";
import { db } from "@/db";
import {
  complaints,
  students,
  auditLog,
  loginAttempts,
  submissionLog,
} from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { formatISTDateTime } from "@/lib/date-utils";
import { MEAL_LABELS } from "@/lib/complaint-limits";
import type { FormattedComplaint } from "@/lib/complaints-query";
import {
  buildComplaintsExcel,
  buildComplaintsPDF,
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
} from "@/lib/export-builders";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Authenticate caller (Admin only)
  const token = request.cookies.get(COOKIE_ADMIN)?.value;
  const adminSession = await getAdminSession(token);
  if (!adminSession) {
    return NextResponse.json(
      { error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }


  // 2. Parse parameters
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get("type") || "complaints").toLowerCase();
  const format = (searchParams.get("format") || "xlsx").toLowerCase();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  try {
    let fileBuffer: Buffer;
    let contentType: string;
    const filename = `manas-admin-${type}-${timestamp}.${format === "pdf" ? "pdf" : "xlsx"}`;

    if (type === "complaints") {
      // All complaints including soft-deleted
      const rows = await db
        .select()
        .from(complaints)
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
        complaintText: r.isDeleted
          ? `[SOFT DELETED: ${r.deletedReason || "No reason specified"}] ${r.complaintText}`
          : r.complaintText,

        createdAt: r.createdAt,
        formattedTime: formatISTDateTime(r.createdAt),
      }));

      if (format === "pdf") {
        fileBuffer = await buildComplaintsPDF(formatted, {
          view: "all-system",
          meal: "all",
          generatedAt: new Date(),
        });
      } else {
        fileBuffer = buildComplaintsExcel(formatted, {
          view: "all-system",
          meal: "all",
          generatedAt: new Date(),
        });
      }
    } else if (type === "roster") {
      const rows = await db
        .select()
        .from(students)
        .orderBy(asc(students.rollNumber));

      const rosterData: ExportStudent[] = rows.map((s) => ({
        rollNumber: s.rollNumber,
        name: s.name,
        block: s.block,
        roomNumber: s.roomNumber,
        course: s.course,
        yearOfJoining: s.yearOfJoining,
        isActive: s.isActive,
        updatedAt: s.updatedAt,
      }));

      if (format === "pdf") {
        fileBuffer = await buildRosterPDF(rosterData);
      } else {
        fileBuffer = buildRosterExcel(rosterData);
      }
    } else if (type === "audit") {
      const rows = await db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt));

      const auditData: ExportAuditLog[] = rows.map((a) => ({
        id: a.id,
        actorId: `${a.actorId} (${a.actorType})`,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        details: a.details,
        createdAt: a.createdAt,
      }));

      if (format === "pdf") {
        fileBuffer = await buildAuditPDF(auditData);
      } else {
        fileBuffer = buildAuditExcel(auditData);
      }
    } else if (type === "logs") {
      const logins = await db
        .select()
        .from(loginAttempts)
        .orderBy(desc(loginAttempts.attemptedAt))
        .limit(1000);

      const submissions = await db
        .select()
        .from(submissionLog)
        .orderBy(desc(submissionLog.attemptedAt))
        .limit(1000);

      const loginData: ExportLoginAttempt[] = logins.map((l) => ({
        id: l.id,
        identifier: l.identifier,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        outcome: l.outcome,
        userType: l.userType,
        attemptedAt: l.attemptedAt,
      }));

      const submissionData: ExportSubmissionLog[] = submissions.map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        meal: s.meal,
        outcome: s.outcome,
        attemptedAt: s.attemptedAt,
      }));

      if (format === "pdf") {
        fileBuffer = await buildSecurityLogsPDF(loginData, submissionData);
      } else {
        fileBuffer = buildSecurityLogsExcel(loginData, submissionData);
      }
    } else {
      return NextResponse.json(
        { error: `Invalid export type: ${type}. Expected: complaints, roster, audit, or logs.` },
        { status: 400 }
      );
    }

    contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate export file", details: message },
      { status: 500 }
    );
  }
}
