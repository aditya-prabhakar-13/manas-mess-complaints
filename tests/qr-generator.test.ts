/**
 * Unit tests for SVG QR Code Generator.
 * Run: npx tsx tests/qr-generator.test.ts
 */
import { generatePortalQrSvg } from "../src/lib/qr-generator";

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
  console.log("\n── 1. Pure SVG QR Code Generation ─────────────────────────────");
  const svgDefault = await generatePortalQrSvg();
  assert(typeof svgDefault === "string", "Returns string content");
  assert(svgDefault.includes("<svg"), "Contains '<svg' opening tag");
  assert(svgDefault.includes("</svg>"), "Contains '</svg>' closing tag");
  assert(svgDefault.includes("xmlns=\"http://www.w3.org/2000/svg\""), "Has valid SVG XML namespace");
  assert(svgDefault.length > 500, "SVG is non-trivial vector length (>500 chars)");

  console.log("\n── 2. Custom Target URL Encoding ──────────────────────────────");
  const customUrl = "https://manas.iitg.ac.in/portal/login?ref=qr";
  const svgCustom = await generatePortalQrSvg(customUrl);
  assert(Boolean(svgCustom), "Generates SVG with custom target URL");
  assert(svgCustom !== svgDefault, "Custom URL produces distinct SVG output from default");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME QR GENERATOR TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL QR GENERATOR TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
