/**
 * Production Environment Configuration Validator.
 * Validates required environment variables before deployment and runtime startup.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionEnv(
  env: Record<string, string | undefined>
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DATABASE_URL
  const dbUrl = env.DATABASE_URL?.trim();
  if (!dbUrl) {
    errors.push("DATABASE_URL is required.");
  } else if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    errors.push("DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://");
  } else if (!dbUrl.includes("sslmode=require")) {
    warnings.push("DATABASE_URL should include 'sslmode=require' for Neon Serverless Postgres.");
  }

  // 2. JWT_SECRET
  const jwtSecret = env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push("JWT_SECRET is required.");
  } else if (jwtSecret.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters long for cryptographic security.");
  } else if (jwtSecret.length < 64) {
    warnings.push("JWT_SECRET is recommended to be a 64-character hex string (256 bits).");
  }

  // 3. SUPER_ADMIN_USERNAME
  const adminUser = env.SUPER_ADMIN_USERNAME?.trim();
  if (!adminUser) {
    errors.push("SUPER_ADMIN_USERNAME is required for initial administrative bootstrap.");
  }

  // 4. SUPER_ADMIN_PASSWORD
  const adminPass = env.SUPER_ADMIN_PASSWORD?.trim();
  if (!adminPass) {
    errors.push("SUPER_ADMIN_PASSWORD is required for initial administrative bootstrap.");
  } else if (adminPass.length < 8) {
    errors.push("SUPER_ADMIN_PASSWORD must be at least 8 characters long.");
  }

  // 5. App URL (NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL)
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!appUrl) {
    warnings.push("Neither NEXT_PUBLIC_APP_URL nor NEXT_PUBLIC_SITE_URL is defined. Falling back to default portal URL.");
  } else if (!appUrl.startsWith("http://") && !appUrl.startsWith("https://")) {
    errors.push("NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL must start with http:// or https://");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
