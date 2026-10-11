"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { smcUsers, loginAttempts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  signToken,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_SMC,
  SMC_SESSION_TTL,
  type SmcSession,
} from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const SmcLoginSchema = z.object({
  rollNumber: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .transform((v) => v.toUpperCase()),
  password: z.string().min(1, "Password is required."),
});

export interface SmcLoginState {
  error?: string;
  success?: boolean;
}

const GENERIC_ERROR = "Invalid Roll Number or Password.";

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT IP & USER AGENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getClientIP(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown"
  );
}

async function getUserAgent(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("user-agent") ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION: loginSmcAction
// ─────────────────────────────────────────────────────────────────────────────
export async function loginSmcAction(
  prevState: SmcLoginState,
  formData: FormData
): Promise<SmcLoginState> {
  const ip = await getClientIP();
  const userAgent = await getUserAgent();

  const parsed = SmcLoginSchema.safeParse({
    rollNumber: formData.get("rollNumber"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { rollNumber, password } = parsed.data;

  // 1. Query active SMC member from database
  const [smcUser] = await db
    .select()
    .from(smcUsers)
    .where(and(eq(smcUsers.rollNumber, rollNumber), eq(smcUsers.isActive, true)))
    .limit(1);

  if (!smcUser) {
    await db.insert(loginAttempts).values({
      identifier: rollNumber,
      ipAddress: ip,
      userAgent,
      outcome: "failure",
      userType: "smc",
    });
    return { error: GENERIC_ERROR };
  }

  // 2. Verify password
  const isMatch = await bcrypt.compare(password, smcUser.passwordHash);
  if (!isMatch) {
    await db.insert(loginAttempts).values({
      identifier: rollNumber,
      ipAddress: ip,
      userAgent,
      outcome: "failure",
      userType: "smc",
    });
    return { error: GENERIC_ERROR };
  }

  // 3. Issue 7-day signed JWT session
  const payload: SmcSession = {
    role: "smc",
    smcUserId: smcUser.id,
    rollNumber: smcUser.rollNumber,
  };

  const token = await signToken(
    payload as Record<string, unknown>,
    SMC_SESSION_TTL
  );
  await setSessionCookie(COOKIE_SMC, token, SMC_SESSION_TTL);

  // 4. Log successful authentication
  await db.insert(loginAttempts).values({
    identifier: rollNumber,
    ipAddress: ip,
    userAgent,
    outcome: "success",
    userType: "smc",
  });

  // 5. Redirect to active complaints feed
  redirect("/smc/complaints");
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION: logoutSmcAction
// ─────────────────────────────────────────────────────────────────────────────
export async function logoutSmcAction(): Promise<void> {
  await clearSessionCookie(COOKIE_SMC);
  redirect("/smc");
}
