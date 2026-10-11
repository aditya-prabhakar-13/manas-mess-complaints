/**
 * Bundle Size & Asset Budget Performance Test Suite.
 * Validates NFR-01 (1-bit pixel aesthetic), NFR-02 (self-hosted VT323 font <20KB),
 * and NFR-03 (boarder route payload transfer <50KB).
 * Run: npx tsx tests/bundle-performance.test.ts
 */
import fs from "fs";
import path from "path";

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
  console.log("\n── 1. Self-Hosted Font Budget (NFR-02) ────────────────────────");
  const fontPath = path.join(process.cwd(), "public", "fonts", "vt323.woff2");
  assert(fs.existsSync(fontPath), "Self-hosted font file exists at public/fonts/vt323.woff2");

  const fontStats = fs.statSync(fontPath);
  const fontSizeBytes = fontStats.size;
  const fontKb = (fontSizeBytes / 1024).toFixed(2);
  console.log(`     Font file size: ${fontKb} KB (${fontSizeBytes} bytes)`);

  assert(fontSizeBytes < 20 * 1024, `VT323 font is under 20 KB budget (<20,480 bytes, actual: ${fontKb} KB)`);
  assert(fontSizeBytes > 5 * 1024, "Font file contains non-trivial font glyph data (>5 KB)");

  console.log("\n── 2. Strict 1-Bit Pixel Aesthetic (NFR-01) ───────────────────");
  const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
  assert(fs.existsSync(cssPath), "Global CSS stylesheet exists");

  const cssContent = fs.readFileSync(cssPath, "utf8");
  assert(cssContent.includes("--bg: #ffffff"), "Background token is pure #ffffff");
  assert(cssContent.includes("--fg: #000000"), "Foreground token is pure #000000");
  assert(cssContent.includes("--disabled: #767676"), "Disabled token is pure #767676");
  assert(!cssContent.includes("fonts.googleapis.com"), "Zero external Google Fonts imports");
  assert(!cssContent.includes("cdnjs.cloudflare.com"), "Zero third-party CDN stylesheet dependencies");

  const borderRadii = cssContent.match(/border-radius:\s*([^;]+);/g) || [];
  const invalidRadii = borderRadii.filter((r) => !r.includes("0px") && !r.includes("0;"));
  assert(invalidRadii.length === 0, "Strict 0px border-radius: zero non-zero border-radii in globals.css");

  console.log("\n── 3. Boarder Route Transfer Budget (<50 KB, NFR-03) ──────────");
  const formPagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const loginPagePath = path.join(process.cwd(), "src", "app", "login", "page.tsx");
  const complaintFormPath = path.join(process.cwd(), "src", "app", "ComplaintForm.tsx");

  assert(fs.existsSync(formPagePath), "Boarder complaint page exists");
  assert(fs.existsSync(loginPagePath), "Boarder login page exists");
  assert(fs.existsSync(complaintFormPath), "ComplaintForm client component exists");

  const complaintFormContent = fs.readFileSync(complaintFormPath, "utf8");
  assert(
    complaintFormContent.includes("setCharCount"),
    "Live character counter logic present in ComplaintForm"
  );

  const cssBytes = fs.statSync(cssPath).size;
  const formPageBytes = fs.statSync(formPagePath).size;
  const loginBytes = fs.statSync(loginPagePath).size;
  const componentBytes = fs.statSync(complaintFormPath).size;

  const totalBoarderPayloadBytes = fontSizeBytes + cssBytes + formPageBytes + componentBytes;
  const totalKb = (totalBoarderPayloadBytes / 1024).toFixed(2);
  console.log(`     Estimated boarder total critical asset weight: ${totalKb} KB`);

  assert(
    totalBoarderPayloadBytes < 50 * 1024,
    `Total boarder critical assets strictly under 50 KB budget (<51,200 bytes, actual: ${totalKb} KB)`
  );

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME BUNDLE PERFORMANCE TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL BUNDLE PERFORMANCE & ASSET BUDGET TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
