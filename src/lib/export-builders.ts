/**
 * Serverless Excel and PDF Document Generation Builders.
 * Uses SheetJS (xlsx) and PDFKit (pure JS Node stream) without headless browsers.
 */
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { formatISTDateTime } from "./date-utils";
import type { FormattedComplaint } from "./complaints-query";

export interface ExportMetadata {
  view: string;           // "active" | "archive"
  meal: string;           // "all", "breakfast", etc.
  month?: string;         // "2026-09"
  generatedAt?: Date;
}

/**
 * Generates an Excel (.xlsx) file buffer from complaints.
 */
export function buildComplaintsExcel(
  complaints: FormattedComplaint[],
  meta: ExportMetadata
): Buffer {
  const rows = complaints.map((c) => ({
    "ID": c.id,
    "Submitted (IST)": c.formattedTime,
    "Meal": c.mealLabel,
    "Roll Number": c.rollNumber,
    "Name": c.nameSnapshot,
    "Block & Room": c.blockRoomSnapshot,
    "Course": c.courseSnapshot,
    "Year of Study": c.yearOfStudySnapshot,
    "Complaint Text": c.complaintText,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set explicit column widths
  worksheet["!cols"] = [
    { wch: 8 },  // ID
    { wch: 22 }, // Submitted (IST)
    { wch: 14 }, // Meal
    { wch: 14 }, // Roll Number
    { wch: 22 }, // Name
    { wch: 14 }, // Block & Room
    { wch: 18 }, // Course
    { wch: 14 }, // Year of Study
    { wch: 50 }, // Complaint Text
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = meta.view === "archive" && meta.month ? `Archive-${meta.month}` : "Active";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

/**
 * Generates a formatted PDF document buffer from complaints.
 */
export function buildComplaintsPDF(
  complaints: FormattedComplaint[],
  meta: ExportMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        info: {
          Title: "Manas Hostel Mess Complaints Report",
          Author: "Services Managing Committee (SMC)",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const generatedStr = formatISTDateTime(meta.generatedAt || new Date());
      const viewLabel =
        meta.view === "archive"
          ? `ARCHIVE${meta.month ? ` (${meta.month})` : ""}`
          : "ACTIVE FEED";
      const mealLabel = meta.meal.toUpperCase();

      // Header Banner
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("MANAS HOSTEL — MESS COMPLAINT REPORT", { align: "left" });

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444444")
        .text(
          `Scope: ${viewLabel}   |   Meal: ${mealLabel}   |   Generated: ${generatedStr}   |   Total: ${complaints.length} Record(s)`,
          { align: "left" }
        );

      doc.moveDown(0.6);

      // Dividing Line
      doc
        .strokeColor("#000000")
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown(0.8);

      if (complaints.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#666666")
          .text("No complaints found for this selection.", { align: "center" });
      } else {
        complaints.forEach((c, index) => {
          // Check if space remains on page, else trigger new page
          if (doc.y > 700) {
            doc.addPage();
          }

          const cardStartY = doc.y;

          // Complaint Header Row
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor("#000000")
            .text(
              `#${c.id}  ${c.nameSnapshot} (${c.blockRoomSnapshot}) — Roll: ${c.rollNumber}`,
              40,
              cardStartY,
              { width: 515, continued: false }
            );

          doc.moveDown(0.2);

          // Subheader Row
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#555555")
            .text(
              `Meal: ${c.mealLabel.toUpperCase()}   |   Submitted: ${c.formattedTime}   |   ${c.yearOfStudySnapshot} • ${c.courseSnapshot}`,
              { width: 515 }
            );

          doc.moveDown(0.4);

          // Complaint Body
          doc
            .font("Helvetica")
            .fontSize(9.5)
            .fillColor("#000000")
            .text(c.complaintText, {
              width: 515,
              lineGap: 2,
            });

          doc.moveDown(0.6);

          // Separator line between records (unless last)
          if (index < complaints.length - 1) {
            doc
              .strokeColor("#dddddd")
              .lineWidth(0.5)
              .moveTo(40, doc.y)
              .lineTo(555, doc.y)
              .stroke();

            doc.moveDown(0.6);
          }
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportStudent {
  rollNumber: string;
  name: string;
  block: string;
  roomNumber: string;
  course: string;
  yearOfJoining: number;
  isActive: boolean;
  updatedAt?: Date;
}

export function buildRosterExcel(students: ExportStudent[]): Buffer {
  const rows = students.map((s) => ({
    "Roll Number": s.rollNumber,
    "Name": s.name,
    "Block": s.block,
    "Room Number": s.roomNumber,
    "Course": s.course,
    "Year of Joining": s.yearOfJoining,
    "Status": s.isActive ? "Active" : "Inactive",
    "Last Updated": s.updatedAt ? formatISTDateTime(s.updatedAt) : "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function buildRosterPDF(students: ExportStudent[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("MANAS HOSTEL — RESIDENT ROSTER REPORT");

      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444444")
        .text(
          `Total Students: ${students.length}   |   Active: ${
            students.filter((s) => s.isActive).length
          }   |   Generated: ${formatISTDateTime(new Date())}`
        );

      doc.moveDown(0.6);
      doc.strokeColor("#000000").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      students.forEach((s) => {
        if (doc.y > 720) doc.addPage();

        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor("#000000")
          .text(
            `${s.rollNumber} — ${s.name}   [Block ${s.block}-${s.roomNumber}]`,
            { continued: true }
          )
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(s.isActive ? "#006600" : "#777777")
          .text(`  (${s.isActive ? "ACTIVE" : "INACTIVE"})`);

        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#555555")
          .text(`Course: ${s.course}   |   Joining Year: ${s.yearOfJoining}`);

        doc.moveDown(0.4);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportAuditLog {
  id: number;
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
  createdAt: Date;
}

export function buildAuditExcel(logs: ExportAuditLog[]): Buffer {
  const rows = logs.map((l) => ({
    "ID": l.id,
    "Timestamp (IST)": formatISTDateTime(l.createdAt),
    "Actor": l.actorId,
    "Action": l.action,
    "Target": l.targetType ? `${l.targetType} #${l.targetId || ""}` : "—",
    "Details": l.details || "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function buildAuditPDF(logs: ExportAuditLog[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("MANAS HOSTEL — ADMINISTRATIVE AUDIT TRAIL");

      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444444")
        .text(`Total Records: ${logs.length}   |   Generated: ${formatISTDateTime(new Date())}`);

      doc.moveDown(0.6);
      doc.strokeColor("#000000").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      logs.forEach((l) => {
        if (doc.y > 720) doc.addPage();

        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor("#000000")
          .text(`[${formatISTDateTime(l.createdAt)}]  Actor: ${l.actorId}  ->  ${l.action}`);

        if (l.targetType || l.details) {
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#555555")
            .text(`Target: ${l.targetType || "—"}   |   Details: ${l.details || "—"}`);
        }

        doc.moveDown(0.4);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY LOGS EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportLoginAttempt {
  id: number;
  identifier: string;
  ipAddress: string;
  userAgent?: string | null;
  outcome: string;
  userType: string;
  attemptedAt: Date;
}

export interface ExportSubmissionLog {
  id: number;
  rollNumber: string;
  ipAddress: string;
  userAgent?: string | null;
  meal?: string | null;
  outcome: string;
  attemptedAt: Date;
}

export function buildSecurityLogsExcel(
  logins: ExportLoginAttempt[],
  submissions: ExportSubmissionLog[]
): Buffer {
  const loginRows = logins.map((l) => ({
    "ID": l.id,
    "Timestamp (IST)": formatISTDateTime(l.attemptedAt),
    "Identifier": l.identifier,
    "User Type": l.userType,
    "Outcome": l.outcome,
    "IP Address": l.ipAddress,
    "User Agent": l.userAgent || "—",
  }));

  const subRows = submissions.map((s) => ({
    "ID": s.id,
    "Timestamp (IST)": formatISTDateTime(s.attemptedAt),
    "Roll Number": s.rollNumber,
    "Meal": s.meal || "—",
    "Outcome": s.outcome,
    "IP Address": s.ipAddress,
    "User Agent": s.userAgent || "—",
  }));

  const workbook = XLSX.utils.book_new();

  const wsLogins = XLSX.utils.json_to_sheet(loginRows);
  wsLogins["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsLogins, "Login Attempts");

  const wsSubs = XLSX.utils.json_to_sheet(subRows);
  wsSubs["!cols"] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsSubs, "Submissions");

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function buildSecurityLogsPDF(
  logins: ExportLoginAttempt[],
  submissions: ExportSubmissionLog[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("MANAS HOSTEL — SECURITY & ACCESS LOGS");

      doc.moveDown(0.3);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444444")
        .text(
          `Logins: ${logins.length}   |   Submissions: ${submissions.length}   |   Generated: ${formatISTDateTime(
            new Date()
          )}`
        );

      doc.moveDown(0.6);
      doc.strokeColor("#000000").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.6);

      // Section 1: Recent Logins
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#000000")
        .text("RECENT AUTHENTICATION ATTEMPTS");
      doc.moveDown(0.4);

      if (logins.length === 0) {
        doc.font("Helvetica").fontSize(9).fillColor("#777777").text("No login attempts recorded.");
      } else {
        logins.slice(0, 100).forEach((l) => {
          if (doc.y > 720) doc.addPage();
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#000000")
            .text(
              `[${formatISTDateTime(l.attemptedAt)}]  ${l.identifier} (${l.userType.toUpperCase()}) — ${l.outcome.toUpperCase()}`
            );
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#555555")
            .text(`IP: ${l.ipAddress}   |   Agent: ${(l.userAgent || "—").slice(0, 60)}`);
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(0.6);
      if (doc.y > 680) doc.addPage();

      // Section 2: Recent Submissions
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#000000")
        .text("RECENT SUBMISSION ATTEMPTS");
      doc.moveDown(0.4);

      if (submissions.length === 0) {
        doc.font("Helvetica").fontSize(9).fillColor("#777777").text("No submissions recorded.");
      } else {
        submissions.slice(0, 100).forEach((s) => {
          if (doc.y > 720) doc.addPage();
          doc
            .font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#000000")
            .text(
              `[${formatISTDateTime(s.attemptedAt)}]  Roll: ${s.rollNumber} — ${s.outcome.toUpperCase()}${
                s.meal ? ` (${s.meal.toUpperCase()})` : ""
              }`
            );
          doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#555555")
            .text(`IP: ${s.ipAddress}   |   Agent: ${(s.userAgent || "—").slice(0, 60)}`);
          doc.moveDown(0.3);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

