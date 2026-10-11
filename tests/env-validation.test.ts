/**
 * Environment Configuration Validator Test Suite.
 * Validates pre-flight production configuration checks and error diagnostics.
 * Run: npx tsx tests/env-validation.test.ts
 */
import { validateProductionEnv } from "../src/lib/env-check";

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
  console.log("\n── 1. Valid Production Environment ────────────────────────────");
  const validEnv = {
    DATABASE_URL: "postgresql://user:pass@ep-cool-pooler.aws.neon.tech/neondb?sslmode=require",
    JWT_SECRET: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    SUPER_ADMIN_USERNAME: "hostel_admin",
    SUPER_ADMIN_PASSWORD: "SuperSecureAdminPassword123!",
    NEXT_PUBLIC_APP_URL: "https://manas-mess.iitg.ac.in",
  };

  const validResult = validateProductionEnv(validEnv);
  assert(validResult.valid === true, "Valid environment configuration accepted");
  assert(validResult.errors.length === 0, "Zero validation errors on valid config");

  console.log("\n── 2. Database URL Validation ─────────────────────────────────");
  const missingDb = validateProductionEnv({ ...validEnv, DATABASE_URL: undefined });
  assert(!missingDb.valid, "Missing DATABASE_URL rejected");
  assert(missingDb.errors.some((e) => e.includes("DATABASE_URL is required")), "Error message mentions missing DB");

  const invalidProtoDb = validateProductionEnv({ ...validEnv, DATABASE_URL: "mysql://user:pass@localhost/db" });
  assert(!invalidProtoDb.valid, "Non-Postgres protocol rejected");

  const noSslDb = validateProductionEnv({ ...validEnv, DATABASE_URL: "postgresql://user:pass@host/db" });
  assert(noSslDb.valid, "Missing sslmode produces warning, not fatal error");
  assert(noSslDb.warnings.some((w) => w.includes("sslmode=require")), "Warning suggests sslmode=require for Neon");

  console.log("\n── 3. Cryptographic Secret Validation ─────────────────────────");
  const missingSecret = validateProductionEnv({ ...validEnv, JWT_SECRET: undefined });
  assert(!missingSecret.valid, "Missing JWT_SECRET rejected");

  const shortSecret = validateProductionEnv({ ...validEnv, JWT_SECRET: "tooshort" });
  assert(!shortSecret.valid, "Short JWT_SECRET (<32 chars) rejected");
  assert(shortSecret.errors.some((e) => e.includes("at least 32 characters")), "Error specifies 32-char minimum");

  console.log("\n── 4. Super Admin Credentials Validation ───────────────────────");
  const missingAdmin = validateProductionEnv({ ...validEnv, SUPER_ADMIN_USERNAME: "" });
  assert(!missingAdmin.valid, "Empty SUPER_ADMIN_USERNAME rejected");

  const shortAdminPass = validateProductionEnv({ ...validEnv, SUPER_ADMIN_PASSWORD: "short" });
  assert(!shortAdminPass.valid, "Short SUPER_ADMIN_PASSWORD (<8 chars) rejected");

  console.log("\n── 5. App URL Validation ──────────────────────────────────────");
  const malformedUrl = validateProductionEnv({ ...validEnv, NEXT_PUBLIC_APP_URL: "ftp://invalid-domain.com" });
  assert(!malformedUrl.valid, "Invalid protocol in URL rejected");

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ SOME ENV VALIDATION TESTS FAILED");
    process.exit(1);
  } else {
    console.log("✅ ALL ENV CONFIGURATION TESTS PASSED\n");
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
