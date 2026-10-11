/**
 * Unit tests for date-utils.ts
 * Run: npx tsx tests/date-utils.test.ts
 */
import {
  computeYearOfStudy,
  formatISTDateTime,
  formatISTDate,
  isArchivedComplaint,
  getISTDayBounds,
} from "../src/lib/date-utils";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    console.error(`         Expected: ${JSON.stringify(expected)}`);
    console.error(`         Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Year of Study Calculations ─────────────────────────────────");

// Oct 2026 (month=10 >= 7 → academicStart = 2026)
// 2024: yearOfStudy = 2026 - 2024 + 1 = 3 → "3rd Year"
const oct2026 = new Date("2026-10-11T06:45:00.000Z"); // IST = 12:15 PM
const result1 = computeYearOfStudy(2024, oct2026);
assertEqual(result1.label, "3rd Year", "2024 joining in Oct 2026 → 3rd Year");
assert(!result1.isFlagged, "2024 joining Oct 2026 is not flagged");

// May 2026 (month=5 < 7 → academicStart = 2025)
// 2024: yearOfStudy = 2025 - 2024 + 1 = 2 → "2nd Year"
const may2026 = new Date("2026-05-15T06:00:00.000Z");
const result2 = computeYearOfStudy(2024, may2026);
assertEqual(result2.label, "2nd Year", "2024 joining in May 2026 → 2nd Year");

// Joining 2021, Oct 2026: 2026 - 2021 + 1 = 6 → "6th Year" (max valid, 6 years some courses)
const result3 = computeYearOfStudy(2021, oct2026);
assertEqual(result3.label, "6th Year", "2021 joining in Oct 2026 → 6th Year");
assert(!result3.isFlagged, "6th Year is not flagged");

// Joining 2028 (future) in Oct 2026: 2026 - 2028 + 1 = -1 → flagged
const result4 = computeYearOfStudy(2028, oct2026);
assertEqual(result4.label, "Check roster", "2028 joining in Oct 2026 → Check roster");
assert(result4.isFlagged, "Future joining year is flagged");

// Joining 2018 (too old) in Oct 2026: 2026 - 2018 + 1 = 9 → flagged
const result5 = computeYearOfStudy(2018, oct2026);
assertEqual(result5.label, "Check roster", "2018 joining in Oct 2026 → Check roster");
assert(result5.isFlagged, "Old joining year > 6 is flagged");

// July exactly (month=7 >= 7 → academicStart = year)
const july2026 = new Date("2026-07-01T00:01:00.000Z"); // IST = 5:31 AM July 1
// July month=7 >= 7 → academicStart = 2026. yearOfStudy = 2026-2024+1 = 3 → "3rd Year"
const result6b = computeYearOfStudy(2024, july2026);
assertEqual(result6b.label, "3rd Year", "2024 joining July 2026 → academicStart=2026, 3rd Year");

// June 30 2026 (month=6 < 7 → academicStart = 2025)
const june2026 = new Date("2026-06-30T20:30:00.000Z"); // IST = June 30 + 5:30 = July 1? NO: 20:30 + 5:30 = 26:00 = July 1 02:00 IST
// Let's use a clearer time: June 30 12:00 UTC = June 30 17:30 IST (month=6)
const june30 = new Date("2026-06-30T06:30:00.000Z"); // IST = 12:00 June 30 → month=6
const result7 = computeYearOfStudy(2024, june30);
assertEqual(result7.label, "2nd Year", "2024 joining June 30 2026 IST → academicStart=2025, 2nd Year");

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── IST DateTime Formatting ─────────────────────────────────────");

// Known UTC time → IST
// 2026-10-11 06:45 UTC = 2026-10-11 12:15 IST
const testDate = new Date("2026-10-11T06:45:00.000Z");
const formatted = formatISTDateTime(testDate);
assertEqual(formatted, "11 Oct 2026, 12:15 PM", "Format UTC 06:45 → IST 12:15 PM");

// 2026-10-11 14:45 UTC = 2026-10-11 20:15 IST
const testDate2 = new Date("2026-10-11T14:45:00.000Z");
const formatted2 = formatISTDateTime(testDate2);
assertEqual(formatted2, "11 Oct 2026, 08:15 PM", "Format UTC 14:45 → IST 8:15 PM");

// 2026-01-01 18:30 UTC = 2026-01-02 00:00 IST (midnight)
const testDate3 = new Date("2026-01-01T18:30:00.000Z");
const formatted3 = formatISTDateTime(testDate3);
assertEqual(formatted3, "02 Jan 2026, 12:00 AM", "Format UTC 18:30 → IST midnight Jan 2");

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── IST Date String ─────────────────────────────────────────────");

const dateStr = formatISTDate(new Date("2026-10-11T06:45:00.000Z")); // IST = Oct 11
assertEqual(dateStr, "2026-10-11", "UTC 06:45 Oct 11 → IST date 2026-10-11");

// UTC 20:30 Oct 11 = IST 02:00 Oct 12
const dateStr2 = formatISTDate(new Date("2026-10-11T20:30:00.000Z"));
assertEqual(dateStr2, "2026-10-12", "UTC 20:30 Oct 11 → IST date 2026-10-12");

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── SMC Archival Rollover ───────────────────────────────────────");

// A complaint created on 2026-09-20 (Sept).
// Cutoff: 7 Oct 2026 23:59:59 IST = 7 Oct 2026 18:29:59 UTC
const septComplaint = new Date("2026-09-20T10:00:00.000Z");

// Evaluated on 7 Oct 2026 23:59 IST = 2026-10-07T18:29:00Z — should NOT be archived
const oct7_2359_IST = new Date("2026-10-07T18:29:00.000Z");
assert(
  !isArchivedComplaint(septComplaint, oct7_2359_IST),
  "Sept complaint on 7 Oct 23:59 IST is NOT archived"
);

// Evaluated on 8 Oct 2026 00:00 IST = 2026-10-07T18:30:00Z — SHOULD be archived
const oct8_0000_IST = new Date("2026-10-07T18:30:01.000Z");
assert(
  isArchivedComplaint(septComplaint, oct8_0000_IST),
  "Sept complaint on 8 Oct 00:00 IST IS archived"
);

// Oct complaint evaluated mid-October — NOT archived
const octComplaint = new Date("2026-10-15T10:00:00.000Z");
const oct20 = new Date("2026-10-20T10:00:00.000Z");
assert(
  !isArchivedComplaint(octComplaint, oct20),
  "Oct complaint on Oct 20 is NOT archived"
);

// Oct complaint evaluated on 9 Nov 2026 (past 7 Nov cutoff) — IS archived
const nov9 = new Date("2026-11-09T00:00:00.000Z");
assert(
  isArchivedComplaint(octComplaint, nov9),
  "Oct complaint on 9 Nov is archived"
);

// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── IST Day Bounds ──────────────────────────────────────────────");

// On Oct 11 12:15 IST (06:45 UTC), bounds should be:
// Start: Oct 11 00:00:00 IST = Oct 10 18:30:00 UTC
// End:   Oct 11 23:59:59.999 IST = Oct 11 18:29:59.999 UTC
const bounds = getISTDayBounds(new Date("2026-10-11T06:45:00.000Z"));
const expectedStart = new Date("2026-10-10T18:30:00.000Z");
const expectedEnd = new Date("2026-10-11T18:29:59.999Z");

assert(
  Math.abs(bounds.startOfDay.getTime() - expectedStart.getTime()) < 1000,
  `IST day start is Oct 10 18:30:00 UTC (got ${bounds.startOfDay.toISOString()})`
);
assert(
  Math.abs(bounds.endOfDay.getTime() - expectedEnd.getTime()) < 1000,
  `IST day end is Oct 11 18:29:59.999 UTC (got ${bounds.endOfDay.toISOString()})`
);

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌ TESTS FAILED`);
  process.exit(1);
} else {
  console.log(`\n✅ ALL TESTS PASSED`);
}
