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
