/**
 * Unit & Integration tests for Active Complaints Query Engine.
 * Run: npx tsx tests/complaints-query.test.ts
 */
import { getActiveFeedCutoffDate, formatISTDateTime } from "../src/lib/date-utils";
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

class MockComplaintsStore {
  rows: MockComplaintRow[] = [];

  addRow(data: Omit<MockComplaintRow, "id">) {
    this.rows.push({
      ...data,
      id: this.rows.length + 1,
    });
  }

  queryActive(options: { meal?: string; page?: number; pageSize?: number; referenceNow?: Date }) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.max(1, options.pageSize ?? 25);
    const offset = (page - 1) * pageSize;
    const cutoffDate = getActiveFeedCutoffDate(options.referenceNow);

    const filtered = this.rows
      .filter((r) => !r.isDeleted && r.createdAt >= cutoffDate)
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
    };
  }
}

async function runTests() {
  console.log("\n── 1. Query-Time Active Cutoff Filter ─────────────────────────");
  const store = new MockComplaintsStore();
  // Reference date: Oct 11, 2026. The 7-day grace period for September complaints ended Oct 7 23:59:59 IST.
  // Therefore, cutoff is Oct 1 00:00:00 IST (Sept complaints are archived).
  const now = new Date("2026-10-11T10:00:00.000Z");

  // September complaint (archived on Oct 11)
  store.addRow({
    rollNumber: "240101001",
    nameSnapshot: "Aarav Sharma",
    courseSnapshot: "B.Tech CSE",
    yearOfStudySnapshot: "3rd Year",
    blockRoomSnapshot: "A-214",
    meal: "breakfast",
    complaintText: "September breakfast issue",
    isDeleted: false,
    createdAt: new Date("2026-09-25T08:00:00.000Z"),
  });

  // October complaints (active)
  for (let i = 1; i <= 30; i++) {
    store.addRow({
      rollNumber: `2401010${i.toString().padStart(2, "0")}`,
      nameSnapshot: `Student ${i}`,
      courseSnapshot: "B.Tech",
      yearOfStudySnapshot: "2nd Year",
      blockRoomSnapshot: `B-${100 + i}`,
      meal: i % 2 === 0 ? "breakfast" : "lunch",
      complaintText: `October complaint ${i}`,
      isDeleted: false,
      createdAt: new Date(`2026-10-05T08:${i.toString().padStart(2, "0")}:00.000Z`),
    });
  }

  // Soft-deleted October complaint
  store.addRow({
    rollNumber: "240101099",
    nameSnapshot: "Spam User",
    courseSnapshot: "B.Tech",
    yearOfStudySnapshot: "1st Year",
    blockRoomSnapshot: "C-101",
    meal: "dinner",
    complaintText: "Spam complaint to delete",
    isDeleted: true,
    createdAt: new Date("2026-10-06T08:00:00.000Z"),
  });

  const resAll = store.queryActive({ meal: "all", page: 1, pageSize: 25, referenceNow: now });
  assert(resAll.total === 30, "Total active complaints is 30 (excludes Sept archived and soft-deleted)");
  assert(resAll.complaints.length === 25, "Page 1 returns 25 items");
  assert(resAll.totalPages === 2, "30 items with 25/page results in 2 pages");
  assert(resAll.complaints[0].complaintText === "October complaint 30", "Results ordered newest first");

  // Page 2
  const resPage2 = store.queryActive({ meal: "all", page: 2, pageSize: 25, referenceNow: now });
  assert(resPage2.complaints.length === 5, "Page 2 returns remaining 5 items");

  console.log("\n── 2. Meal Filter ─────────────────────────────────────────────");
  const resBreakfast = store.queryActive({ meal: "breakfast", page: 1, pageSize: 25, referenceNow: now });
  assert(resBreakfast.total === 15, "Meal filter 'breakfast' returns 15 breakfast complaints");
  assert(resBreakfast.complaints.every((c) => c.meal === "breakfast"), "Every returned item is breakfast");

  const resLunch = store.queryActive({ meal: "lunch", page: 1, pageSize: 25, referenceNow: now });
  assert(resLunch.total === 15, "Meal filter 'lunch' returns 15 lunch complaints");

  const resDinner = store.queryActive({ meal: "dinner", page: 1, pageSize: 25, referenceNow: now });
  assert(resDinner.total === 0, "Meal filter 'dinner' returns 0 (only deleted dinner existed)");

  console.log("\n── 3. Formatted Metadata Snapshots ────────────────────────────");
  const firstItem = resAll.complaints[0];
  assert(firstItem.mealLabel === "Breakfast", "Meal label is capitalized 'Breakfast'");
  assert(firstItem.formattedTime.includes("Oct 2026"), "Formatted time includes month and year");
  assert(firstItem.blockRoomSnapshot.startsWith("B-"), "Block-Room snapshot preserved");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL COMPLAINTS QUERY TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
