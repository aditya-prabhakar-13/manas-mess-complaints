/**
 * Postgres-backed rate limiting and lockout enforcement.
 * No Redis required — all state lives in the `login_attempts` table.
 *
 * Login lockout rule:
 *   5 or more failures within 15 minutes → locked for 15 minutes.
 */
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { lt, and, eq, gte, count } from "drizzle-orm";

export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILURES = 5;

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN LOCKOUT CHECK
// ─────────────────────────────────────────────────────────────────────────────

export interface LockoutStatus {
  isLocked: boolean;
  remainingMinutes?: number;
  remainingSeconds?: number;
  unlockAt?: Date;
}

/**
 * Check whether a given identifier (roll number) OR IP address is currently
 * locked out due to too many failed login attempts.
 *
 * Reads the most recent failed attempt timestamps from `login_attempts`.
 * If >= 5 failures within the last 15 minutes exist for either the roll number
 * or the IP, the lockout is active until 15 minutes after the FIRST failure
 * in that burst.
 */
export async function checkLoginLockout(
  identifier: string,
  ip: string
): Promise<LockoutStatus> {
  const windowStart = new Date(
    Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000
  );

  // Count recent failures for identifier (roll number)
  const [identifierFailures] = await db
    .select({ count: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier.toUpperCase()),
        eq(loginAttempts.outcome, "failure"),
        gte(loginAttempts.attemptedAt, windowStart)
      )
    );

  // Count recent failures for IP address
  const [ipFailures] = await db
    .select({ count: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipAddress, ip),
        eq(loginAttempts.outcome, "failure"),
        gte(loginAttempts.attemptedAt, windowStart)
      )
    );

  const identifierCount = identifierFailures?.count ?? 0;
  const ipCount = ipFailures?.count ?? 0;

  if (identifierCount >= LOGIN_MAX_FAILURES || ipCount >= LOGIN_MAX_FAILURES) {
    // Compute remaining lockout time based on the earliest failure in the window
    const now = Date.now();
    const lockedUntilMs = windowStart.getTime() + LOGIN_WINDOW_MINUTES * 60 * 1000;
    const remainingMs = Math.max(0, lockedUntilMs - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);

    return {
      isLocked: true,
      remainingMinutes,
      remainingSeconds,
      unlockAt: new Date(lockedUntilMs),
    };
  }

  return { isLocked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD LOGIN ATTEMPT
// ─────────────────────────────────────────────────────────────────────────────

export async function recordLoginAttempt(
  identifier: string,
  ip: string,
  userAgent: string | null,
  outcome: "success" | "failure" | "lockout",
  userType: "boarder" | "smc" | "admin" = "boarder"
): Promise<void> {
  await db.insert(loginAttempts).values({
    identifier: identifier.toUpperCase(),
    ipAddress: ip,
    userAgent: userAgent ?? "",
    outcome,
    userType,
  });
}
