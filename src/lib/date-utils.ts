/**
 * Asia/Kolkata (IST) timezone utilities.
 * All date calculations for the portal — rate limit windows,
 * Year of Study computation, complaint archival rollover — live here.
 */

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30

/**
 * Convert any date to an IST Date object (local time in IST).
 * This returns a Date whose UTC time is offset to match IST wall clock.
 * Use for display and boundary calculations only.
 */
function toISTDate(date: Date): Date {
  // Intl.DateTimeFormat gives us the actual IST wall-clock components
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  const year = get("year");
  const month = get("month") - 1; // JS months 0-indexed
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Get IST wall-clock components for the given UTC date.
 */
function getISTComponents(date: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  return {
    year: get("year"),
    month: get("month"), // 1-12
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Format a UTC date as "DD MMM YYYY, hh:mm AM/PM" in IST.
 * Example: "11 Oct 2026, 08:15 PM"
 */
export function formatISTDateTime(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const { year, month, day, hour, minute } = getISTComponents(d);

  const dd = String(day).padStart(2, "0");
  const mmm = MONTH_NAMES[month - 1];
  const yyyy = year;

  const isPM = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const hh = String(h12).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ampm = isPM ? "PM" : "AM";

  return `${dd} ${mmm} ${yyyy}, ${hh}:${mm} ${ampm}`;
}

/**
 * Format as "Month YYYY" for archive grouping.
 * Example: "September 2026"
 */
export function formatISTMonthYear(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const { year, month } = getISTComponents(d);
  return `${MONTH_FULL_NAMES[month - 1]} ${year}`;
}

/**
 * Format as "YYYY-MM-DD" in IST (for Gala date comparisons).
 */
export function formatISTDate(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const { year, month, day } = getISTComponents(d);
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY BOUNDARIES (for rate limiting)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the UTC timestamps for the start and end of the current IST calendar
 * day. Used for per-day rate limit queries.
 */
export function getISTDayBounds(referenceDate?: Date): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const now = referenceDate ?? new Date();
  const { year, month, day } = getISTComponents(now);

  // IST day starts at 00:00:00 IST = UTC -5h30m
  // We construct the UTC equivalent of IST midnight
  const istMidnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS;
  const startOfDay = new Date(istMidnightUTC);
  const endOfDay = new Date(istMidnightUTC + 24 * 60 * 60 * 1000 - 1);

  return { startOfDay, endOfDay };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEAR OF STUDY
// ─────────────────────────────────────────────────────────────────────────────

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const ACADEMIC_START_MONTH = 7; // July (months 1-12)

/**
 * Compute the ordinal Year of Study label from a joining year.
 *
 * Algorithm:
 *   academicStart = currentYear if IST month >= 7, else currentYear - 1
 *   yearOfStudy   = academicStart - yearOfJoining + 1
 *
 * Returns:
 *   { yearNumber, label, isFlagged }
 *   - label: "1st Year" … "5th Year" (ordinal)
 *   - isFlagged: true if yearOfStudy < 1 or yearOfStudy > 6
 */
export function computeYearOfStudy(
  yearOfJoining: number,
  currentDate?: Date
): { yearNumber: number; label: string; isFlagged: boolean } {
  const now = currentDate ?? new Date();
  const { year, month } = getISTComponents(now);

  const academicStart = month >= ACADEMIC_START_MONTH ? year : year - 1;
  const yearNumber = academicStart - yearOfJoining + 1;

  if (yearNumber < 1 || yearNumber > 6) {
    return { yearNumber, label: "Check roster", isFlagged: true };
  }

  const ordinal = ORDINALS[yearNumber - 1];
  return { yearNumber, label: `${ordinal} Year`, isFlagged: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMC ARCHIVAL ROLLOVER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a complaint has moved to the archive.
 *
 * Rule: A complaint from month M stays in the active feed until
 *       23:59:59.999 IST on the 7th day of month M+1.
 *       After that instant it belongs to the archive.
 *
 * Example:
 *   createdAt = "2026-09-20" (September)
 *   cutoff    = "2026-10-07 23:59:59.999 IST"
 *   If referenceNow > cutoff → complaint is archived.
 */
export function isArchivedComplaint(
  createdAt: Date | string | number,
  referenceNow?: Date
): boolean {
  const created = typeof createdAt === "object" ? createdAt : new Date(createdAt);
  const now = referenceNow ?? new Date();

  const { year: cy, month: cm } = getISTComponents(created);

  // Compute the first day of month M+1
  let cutoffMonth: number;
  let cutoffYear: number;
  if (cm === 12) {
    cutoffMonth = 1;
    cutoffYear = cy + 1;
  } else {
    cutoffMonth = cm + 1;
    cutoffYear = cy;
  }

  // Cutoff = 7th day of month M+1, end of IST day (23:59:59.999)
  // UTC equivalent: IST 23:59:59 on day 7 of cutoffMonth
  const cutoffUTC =
    Date.UTC(cutoffYear, cutoffMonth - 1, 7, 23, 59, 59, 999) - IST_OFFSET_MS;

  return now.getTime() > cutoffUTC;
}

/**
 * Return the SQL WHERE clause boundary for active complaints.
 * Complaints created after this threshold are in the active feed;
 * those before are archived. Used in Drizzle queries.
 */
export function getActiveFeedCutoffDate(referenceNow?: Date): Date {
  const now = referenceNow ?? new Date();
  const { year, month } = getISTComponents(now);

  // The earliest month still in the active feed:
  // Any month M whose cutoff (7th of M+1) is still >= now
  // We need complaints from previous month if we're still within the 7-day grace period
  let prevMonth: number;
  let prevYear: number;
  if (month === 1) {
    prevMonth = 12;
    prevYear = year - 1;
  } else {
    prevMonth = month - 1;
    prevYear = year;
  }

  // Cutoff for the previous month: 7th of current month, 23:59:59 IST
  const prevMonthCutoffUTC =
    Date.UTC(year, month - 1, 7, 23, 59, 59, 999) - IST_OFFSET_MS;

  if (now.getTime() <= prevMonthCutoffUTC) {
    // Still in grace period: show complaints from prevMonth onward
    return new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  } else {
    // Grace period over: show only current month's complaints
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  }
}
