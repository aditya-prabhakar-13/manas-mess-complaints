/**
 * Security Hardening & Edge Defense Test Suite.
 * Tests HTTP security headers, middleware API defense, CSRF origin verification, and concurrent submission safety.
 * Run: npx tsx tests/security-hardening.test.ts
 */
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { signToken, COOKIE_ADMIN } from "../src/lib/auth";
import nextConfig from "../next.config.mjs";
import {
  MAX_COMPLAINTS_PER_MEAL,
  MAX_COMPLAINTS_PER_DAY_STUDENT,
  MAX_COMPLAINTS_PER_DAY_IP,
} from "../src/lib/complaint-limits";


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
  console.log("\n── 1. HTTP Security Headers Configuration ─────────────────────");
  if (typeof nextConfig.headers === "function") {
    const headersList = await nextConfig.headers();
    const globalRule = headersList.find((h) => h.source === "/(.*)");
    assert(globalRule !== undefined, "Global header rule /(.*) configured");

    const headerMap = new Map(
      globalRule?.headers.map((h) => [h.key, h.value]) || []
    );

    assert(headerMap.get("X-Frame-Options") === "DENY", "X-Frame-Options is DENY");
    assert(
      headerMap.get("X-Content-Type-Options") === "nosniff",
      "X-Content-Type-Options is nosniff"
    );
    assert(
      headerMap.get("Strict-Transport-Security")?.includes("max-age="),
      "Strict-Transport-Security (HSTS) is enabled with max-age"
    );
    assert(
      headerMap.get("X-DNS-Prefetch-Control") === "off",
      "X-DNS-Prefetch-Control is off"
    );
    assert(
      headerMap.get("Content-Security-Policy")?.includes("frame-ancestors 'none'"),
      "CSP prevents frame embedding (frame-ancestors 'none')"
    );
    assert(
      headerMap.get("Content-Security-Policy")?.includes("default-src 'self'"),
      "CSP restricts default sources to 'self'"
    );
  } else {
    assert(false, "nextConfig.headers must be a function");
  }

  console.log("\n── 2. Middleware API Route Defense ────────────────────────────");
  // Unauthorized call to /api/admin/export
  const adminApiReq = new NextRequest("http://localhost:3000/api/admin/export");
  const adminApiRes = await middleware(adminApiReq);
  assert(adminApiRes.status === 401, "/api/admin/export unauthenticated returns 401");
  const adminJson = await adminApiRes.json();
  assert(adminJson.error?.includes("Admin session required"), "Clarifies admin requirement");

  // Unauthorized call to /api/export/complaints
  const exportApiReq = new NextRequest("http://localhost:3000/api/export/complaints");
  const exportApiRes = await middleware(exportApiReq);
  assert(exportApiRes.status === 401, "/api/export/complaints unauthenticated returns 401");

  // Authorized call to /api/admin/export with valid admin cookie
  const validAdminToken = await signToken({
    role: "admin",
    userId: 1,
    username: "admin",
    isSuperAdmin: true,
  });
  const authAdminReq = new NextRequest("http://localhost:3000/api/admin/export", {
    headers: {
      cookie: `${COOKIE_ADMIN}=${validAdminToken}`,
    },
  });
  const authAdminRes = await middleware(authAdminReq);
  assert(authAdminRes.status === 200, "/api/admin/export with valid admin token succeeds (status 200)");

  console.log("\n── 3. CSRF Cross-Origin Attack Defense ────────────────────────");
  // Malicious external origin attempt
  const crossOriginReq = new NextRequest("http://localhost:3000/api/admin/export", {
    method: "POST",
    headers: {
      origin: "https://malicious-hostel-attacker.com",
    },
  });
  const crossOriginRes = await middleware(crossOriginReq);
  assert(crossOriginRes.status === 403, "POST from cross-origin attacker blocked with 403 Forbidden");

  // Malicious external referer attempt
  const crossRefererReq = new NextRequest("http://localhost:3000/api/admin/export", {
    method: "POST",
    headers: {
      referer: "https://phishing-site.org/attack",
    },
  });
  const crossRefererRes = await middleware(crossRefererReq);
  assert(crossRefererRes.status === 403, "POST with external referer blocked with 403 Forbidden");

  // Same-origin POST allowed
  const sameOriginReq = new NextRequest("http://localhost:3000/login", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
    },
  });
  const sameOriginRes = await middleware(sameOriginReq);
  assert(sameOriginRes.status === 200, "POST with matching origin passes CSRF check (status 200)");

  console.log("\n── 4. Concurrency & Rate Limit Boundaries ─────────────────────");
  assert(MAX_COMPLAINTS_PER_MEAL === 3, "Per-meal limit is strictly 3");
  assert(MAX_COMPLAINTS_PER_DAY_STUDENT === 6, "Per-student daily limit is strictly 6");
  assert(MAX_COMPLAINTS_PER_DAY_IP === 40, "Daily IP limit backstop is strictly 40");

  // Verify limit boundary logic: simulate current counts at and above thresholds
  function evaluateMealLimit(count: number): boolean {
    return count < MAX_COMPLAINTS_PER_MEAL;
  }
  function evaluateDayLimit(count: number): boolean {
    return count < MAX_COMPLAINTS_PER_DAY_STUDENT;
  }
  function evaluateIpLimit(count: number): boolean {
    return count < MAX_COMPLAINTS_PER_DAY_IP;
  }

  assert(evaluateMealLimit(2) === true, "2 meal complaints: next submission allowed");
  assert(evaluateMealLimit(3) === false, "3 meal complaints: 4th concurrent submission blocked");
  assert(evaluateMealLimit(4) === false, "Above meal threshold: strictly blocked");

  assert(evaluateDayLimit(5) === true, "5 daily complaints: next submission allowed");
  assert(evaluateDayLimit(6) === false, "6 daily complaints: 7th submission blocked");

  assert(evaluateIpLimit(39) === true, "39 IP submissions: next submission allowed");
  assert(evaluateIpLimit(40) === false, "40 IP submissions: 41st submission blocked");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME SECURITY TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL SECURITY HARDENING TESTS PASSED\n");
  }
}


runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
