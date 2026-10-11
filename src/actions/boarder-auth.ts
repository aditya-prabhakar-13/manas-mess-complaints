"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { students } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  signToken,
  setSessionCookie,
  clearSessionCookie,
  COOKIE_BOARDER,
  BOARDER_SESSION_TTL,
  type BoarderSession,
} from "@/lib/auth";
import {
  checkLoginLockout,
  recordLoginAttempt,
} from "@/lib/rate-limit";
import { computeYearOfStudy } from "@/lib/date-utils";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  block: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Invalid block selection." }),
  }),
  roomNumber: z.string().trim().min(1, "Room number is required.").max(20),
  rollNumber: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .max(50)
    .transform((v) => v.toUpperCase()),
});

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC ERROR — never reveal which field was wrong
// ─────────────────────────────────────────────────────────────────────────────
const GENERIC_ERROR = "Invalid Block, Room Number, or Roll Number.";

function getLockoutMessage(remainingMinutes: number): string {
  return `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CLIENT IP
// ─────────────────────────────────────────────────────────────────────────────
async function getClientIP(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown"
  );
}

function getUserAgent(): Promise<string> {
  return headers().then((hdrs) => hdrs.get("user-agent") ?? "");
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION: loginBoarderAction
// ─────────────────────────────────────────────────────────────────────────────
export interface LoginState {
  error?: string;
  success?: boolean;
}

export async function loginBoarderAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const ip = await getClientIP();
  const userAgent = await getUserAgent();

  // ── Validate inputs ──────────────────────────────────────────────────────
  const parsed = LoginSchema.safeParse({
    block: formData.get("block"),
    roomNumber: formData.get("roomNumber"),
    rollNumber: formData.get("rollNumber"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { block, roomNumber, rollNumber } = parsed.data;

  // ── Check lockout ────────────────────────────────────────────────────────
  const lockout = await checkLoginLockout(rollNumber, ip);
  if (lockout.isLocked) {
    await recordLoginAttempt(rollNumber, ip, userAgent, "lockout");
    return { error: getLockoutMessage(lockout.remainingMinutes ?? 15) };
  }

  // ── Query active roster ──────────────────────────────────────────────────
  const [student] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(sql`UPPER(${students.rollNumber})`, rollNumber),
        eq(sql`UPPER(${students.block})`, block),
        eq(sql`LOWER(TRIM(${students.roomNumber}))`, roomNumber.toLowerCase()),
        eq(students.isActive, true)
      )
    )
    .limit(1);

  // ── Failed: no match ──────────────────────────────────────────────────────
  if (!student) {
    await recordLoginAttempt(rollNumber, ip, userAgent, "failure");

    // Re-check if this failure triggered a lockout
    const newLockout = await checkLoginLockout(rollNumber, ip);
    if (newLockout.isLocked) {
      return { error: getLockoutMessage(newLockout.remainingMinutes ?? 15) };
    }

    return { error: GENERIC_ERROR };
  }

  // ── Compute year of study ─────────────────────────────────────────────────
  const { label: yearLabel } = computeYearOfStudy(student.yearOfJoining);
  const blockRoom = `${student.block}-${student.roomNumber}`;

  // ── Sign session token (14 days, non-sliding) ─────────────────────────────
  const sessionPayload: BoarderSession = {
    role: "boarder",
    studentId: student.id,
    rollNumber: student.rollNumber,
    name: student.name,
    block: student.block,
    roomNumber: student.roomNumber,
    blockRoom,
  };

  const token = await signToken(
    sessionPayload as Record<string, unknown>,
    BOARDER_SESSION_TTL
  );
  await setSessionCookie(COOKIE_BOARDER, token, BOARDER_SESSION_TTL);

  // ── Record success ────────────────────────────────────────────────────────
  await recordLoginAttempt(rollNumber, ip, userAgent, "success");

  // Redirect after setting cookie
  redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION: logoutBoarderAction
// ─────────────────────────────────────────────────────────────────────────────
export async function logoutBoarderAction(): Promise<void> {
  await clearSessionCookie(COOKIE_BOARDER);
  redirect("/login");
}
