/**
 * Unit tests for Gala Dinner date logic and dynamic meal replacement.
 * Run: npx tsx tests/gala.test.ts
 */
import { getAvailableMeals } from "../src/lib/gala";
import { formatISTDate } from "../src/lib/date-utils";

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

async function runTests() {
  console.log("\n── 1. Dynamic Meal Options Replacement ─────────────────────────");

  // Standard day (isGalaDay: false)
  const standardMeals = getAvailableMeals(false);
  assert(standardMeals.length === 3, "Standard day returns exactly 3 meals");
  assert(standardMeals.some((m) => m.value === "breakfast"), "Standard day includes breakfast");
  assert(standardMeals.some((m) => m.value === "lunch"), "Standard day includes lunch");
  assert(standardMeals.some((m) => m.value === "dinner"), "Standard day includes dinner");
  assert(!standardMeals.some((m) => m.value === "gala_dinner"), "Standard day does NOT include gala_dinner");

  // Gala day (isGalaDay: true)
  const galaMeals = getAvailableMeals(true);
  assert(galaMeals.length === 3, "Gala day returns exactly 3 meals");
  assert(galaMeals.some((m) => m.value === "breakfast"), "Gala day includes breakfast");
  assert(galaMeals.some((m) => m.value === "lunch"), "Gala day includes lunch");
  assert(galaMeals.some((m) => m.value === "gala_dinner"), "Gala day includes gala_dinner");
  assert(!galaMeals.some((m) => m.value === "dinner"), "Gala day does NOT include regular dinner (dinner is replaced)");

  const galaOption = galaMeals.find((m) => m.value === "gala_dinner");
  assert(galaOption?.isGala === true, "Gala dinner option has isGala flag set to true");
  assert(galaOption?.label === "Gala Dinner", "Gala dinner label matches exactly");

  console.log("\n── 2. IST Date Resolution for Gala Dates ───────────────────────");
  // Ensure formatISTDate formats strictly as YYYY-MM-DD in Asia/Kolkata
  const utcLateNight = new Date("2026-10-11T20:00:00.000Z"); // Oct 12 01:30 AM IST
  assert(formatISTDate(utcLateNight) === "2026-10-12", "Late night UTC correctly maps to next day in IST");

  const utcMorning = new Date("2026-10-11T03:00:00.000Z"); // Oct 11 08:30 AM IST
  assert(formatISTDate(utcMorning) === "2026-10-11", "Morning UTC correctly maps to current day in IST");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL GALA TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
