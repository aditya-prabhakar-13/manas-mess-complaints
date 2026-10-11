/**
 * Unit & Integration tests for SMC Complaints Archive Query Engine.
 * Run: npx tsx tests/archive-query.test.ts
 */
import {
  getActiveFeedCutoffDate,
  formatISTDateTime,
  formatISTMonthYear,
} from "../src/lib/date-utils";
import { MEAL_LABELS } from "../src/lib/complaint-limits";

let passed = 0;
let failed = 0;

function assert(condition: boolean | undefined | null, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

interface MockComplaintRow {
  id: number;
  rollNumber: string;
  nameSnapshot: string;
  courseSnapshot: string;
  yearOfStudySnapshot: string;
  blockRoomSnapshot: string;
  meal: string;
  complaintText: string;
  isDeleted: boolean;
  createdAt: Date;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

class MockArchiveComplaintsStore {
  rows: MockComplaintRow[] = [];

  addRow(data: Omit<MockComplaintRow, "id">) {
    this.rows.push({
      ...data,
      id: this.rows.length + 1,
    });
  }

  getArchivedMonths(referenceNow?: Date) {
    const cutoffDate = getActiveFeedCutoffDate(referenceNow);

    const archivedRows = this.rows
      .filter((r) => !r.isDeleted && r.createdAt < cutoffDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const monthMap = new Map<string, { label: string; count: number }>();

    for (const r of archivedRows) {
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

  getArchivedComplaints(options: {
    monthKey?: string;
    meal?: string;
    page?: number;
    pageSize?: number;
    referenceNow?: Date;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.max(1, options.pageSize ?? 25);
    const offset = (page - 1) * pageSize;
    const cutoffDate = getActiveFeedCutoffDate(options.referenceNow);

    let targetMonthKey = options.monthKey;
    if (!targetMonthKey) {
      const available = this.getArchivedMonths(options.referenceNow);
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

    const [yearStr, monthStr] = targetMonthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startOfMonthUTC =
      Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endOfMonthUTC =
      Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999) - IST_OFFSET_MS;

    const startOfRange = new Date(startOfMonthUTC);
    const endOfRange = new Date(Math.min(endOfMonthUTC, cutoffDate.getTime()));

    const filtered = this.rows
      .filter(
        (r) =>
          !r.isDeleted &&
          r.createdAt >= startOfRange &&
          r.createdAt <= endOfRange
      )
      .filter((r) => {
        if (!options.meal || options.meal === "all") return true;
        return r.meal.toLowerCase() === options.meal.toLowerCase();
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const paged = filtered.slice(offset, offset + pageSize);

    const formatted = paged.map((r) => ({
      ...r,
      mealLabel: MEAL_LABELS[r.meal] ?? r.meal,
      formattedTime: formatISTDateTime(r.createdAt),
    }));

    return {
      complaints: formatted,
      total,
      page,
      pageSize,
      totalPages,
      monthKey: targetMonthKey,
      monthLabel: formatISTMonthYear(startOfRange),
    };
  }
}

async function runTests() {
  console.log("\n── 1. Query-Time Rollover & Month-Year Grouping ───────────────");
  const store = new MockArchiveComplaintsStore();

  // Test reference date: 11 Oct 2026 12:00:00 IST (UTC: 06:30)
  // At this time, October complaints are active.
  // September complaints (grace ended Oct 7 23:59:59 IST) are archived.
  // August complaints are archived.
  const now = new Date("2026-10-11T06:30:00.000Z");

  // Add 10 August complaints
  for (let i = 1; i <= 10; i++) {
    store.addRow({
      rollNumber: `2401010${i.toString().padStart(2, "0")}`,
      nameSnapshot: `August Student ${i}`,
      courseSnapshot: "B.Tech",
      yearOfStudySnapshot: "3rd Year",
      blockRoomSnapshot: "A-101",
      meal: i % 2 === 0 ? "breakfast" : "dinner",
      complaintText: `August complaint ${i}`,
      isDeleted: false,
      createdAt: new Date(`2026-08-15T12:${i.toString().padStart(2, "0")}:00.000Z`),
    });
  }

  // Add 30 September complaints (15 breakfast, 15 lunch)
  for (let i = 1; i <= 30; i++) {
    store.addRow({
      rollNumber: `2401010${(i + 10).toString().padStart(2, "0")}`,
      nameSnapshot: `Sept Student ${i}`,
      courseSnapshot: "B.Tech",
      yearOfStudySnapshot: "2nd Year",
      blockRoomSnapshot: "B-201",
      meal: i <= 15 ? "breakfast" : "lunch",
      complaintText: `September complaint ${i}`,
      isDeleted: false,
      createdAt: new Date(`2026-09-20T10:${i.toString().padStart(2, "0")}:00.000Z`),
    });
  }

  // Add 1 soft-deleted September complaint
  store.addRow({
    rollNumber: "240101999",
    nameSnapshot: "Deleted Student",
    courseSnapshot: "B.Tech",
    yearOfStudySnapshot: "1st Year",
    blockRoomSnapshot: "B-202",
    meal: "breakfast",
    complaintText: "Spam complaint that was soft-deleted",
    isDeleted: true,
    createdAt: new Date("2026-09-21T10:00:00.000Z"),
  });

  // Add 5 October complaints (active, should NOT appear in archive)
  for (let i = 1; i <= 5; i++) {
    store.addRow({
      rollNumber: `2401010${(i + 50).toString().padStart(2, "0")}`,
      nameSnapshot: `Oct Student ${i}`,
      courseSnapshot: "B.Tech",
      yearOfStudySnapshot: "4th Year",
      blockRoomSnapshot: "C-301",
      meal: "lunch",
      complaintText: `October active complaint ${i}`,
      isDeleted: false,
      createdAt: new Date(`2026-10-05T08:00:00.000Z`),
    });
  }

  const months = store.getArchivedMonths(now);
  assert(months.length === 2, "Found exactly 2 archived months (Sept 2026 and Aug 2026)");
  assert(months[0].monthKey === "2026-09", "First month is September 2026 (descending order)");
  assert(months[0].label === "September 2026", "Label is 'September 2026'");
  assert(months[0].count === 30, "September count is 30 (excludes soft-deleted item)");
  assert(months[1].monthKey === "2026-08", "Second month is August 2026");
  assert(months[1].count === 10, "August count is 10");

  console.log("\n── 2. Default & Specific Month Querying ───────────────────────");
  // Default month query (should pick September 2026)
  const defaultRes = store.getArchivedComplaints({ referenceNow: now });
  assert(defaultRes.monthKey === "2026-09", "Defaults to newest archived month (2026-09)");
  assert(defaultRes.total === 30, "September total is 30");
  assert(defaultRes.complaints.length === 25, "Page 1 returns 25 items");
  assert(defaultRes.totalPages === 2, "30 items gives 2 total pages");

  // Specific month query (August 2026)
  const augRes = store.getArchivedComplaints({
    monthKey: "2026-08",
    referenceNow: now,
  });
  assert(augRes.monthKey === "2026-08", "Queried August 2026 successfully");
  assert(augRes.total === 10, "August total is 10");
  assert(augRes.complaints.length === 10, "Page 1 contains all 10 August items");
  assert(augRes.totalPages === 1, "1 page total for August");

  console.log("\n── 3. Meal Filtering in Archived Month ────────────────────────");
  const septBreakfast = store.getArchivedComplaints({
    monthKey: "2026-09",
    meal: "breakfast",
    referenceNow: now,
  });
  assert(septBreakfast.total === 15, "September breakfast returns 15 items");
  assert(
    septBreakfast.complaints.every((c) => c.meal === "breakfast"),
    "All returned complaints have meal 'breakfast'"
  );

  const septLunch = store.getArchivedComplaints({
    monthKey: "2026-09",
    meal: "lunch",
    referenceNow: now,
  });
  assert(septLunch.total === 15, "September lunch returns 15 items");

  const septDinner = store.getArchivedComplaints({
    monthKey: "2026-09",
    meal: "dinner",
    referenceNow: now,
  });
  assert(septDinner.total === 0, "September dinner returns 0 items");

  console.log("\n── 4. Pagination in Archived Month ────────────────────────────");
  const septPage2 = store.getArchivedComplaints({
    monthKey: "2026-09",
    page: 2,
    pageSize: 25,
    referenceNow: now,
  });
  assert(septPage2.page === 2, "Page index is 2");
  assert(septPage2.complaints.length === 5, "Page 2 contains 5 remaining items");

  console.log("\n── 5. Empty State Handling ────────────────────────────────────");
  const emptyStore = new MockArchiveComplaintsStore();
  const emptyMonths = emptyStore.getArchivedMonths(now);
  assert(emptyMonths.length === 0, "Empty store returns 0 archived months");

  const emptyRes = emptyStore.getArchivedComplaints({ referenceNow: now });
  assert(emptyRes.complaints.length === 0, "Empty store complaints array is empty");
  assert(emptyRes.total === 0, "Empty store total is 0");
  assert(emptyRes.monthLabel === "No Archive Data", "Empty store month label is 'No Archive Data'");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ARCHIVE QUERY TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ARCHIVE QUERY TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
