"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { admins, loginAttempts } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";
import {
  signToken,
  setSessionCookie,
  clearSessionCookie,
  getAdminSession,
  COOKIE_ADMIN,
  ADMIN_SESSION_TTL,
  type AdminSession,
} from "@/lib/auth";
import { ensureSuperAdmin } from "@/lib/admin-bootstrap";
import { recordAuditLog } from "@/lib/audit";

const AdminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

const SecondaryAdminSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(50, "Username too long."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters."),
});

export interface AdminActionState {
  error?: string;
  success?: boolean;
}

const GENERIC_ERROR = "Invalid username or password.";

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

/**
 * Admin Login Action.
 */
export async function loginAdminAction(
  prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await ensureSuperAdmin();

  const ip = await getClientIP();
  const ua = await getUserAgent();

  const rawUsername = formData.get("username")?.toString() ?? "";
  const rawPassword = formData.get("password")?.toString() ?? "";

  const parsed = AdminLoginSchema.safeParse({
    username: rawUsername,
    password: rawPassword,
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const { username, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(admins)
    .where(and(eq(admins.username, username), eq(admins.isActive, true)))
    .limit(1);

  if (!admin) {
    await db.insert(loginAttempts).values({
      identifier: username,
      ipAddress: ip,
      userAgent: ua,
      outcome: "failure",
      userType: "admin",
    });
    return { error: GENERIC_ERROR };
  }

  const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

  if (!isValidPassword) {
    await db.insert(loginAttempts).values({
      identifier: username,
      ipAddress: ip,
      userAgent: ua,
      outcome: "failure",
      userType: "admin",
    });
    return { error: GENERIC_ERROR };
  }

  // Record successful login
  await db.insert(loginAttempts).values({
    identifier: username,
    ipAddress: ip,
    userAgent: ua,
    outcome: "success",
    userType: "admin",
  });

  await recordAuditLog({
    actorId: admin.username,
    action: "admin_login",
    targetType: "admin",
    targetId: admin.id.toString(),
    details: { ip, isSuperAdmin: admin.isSuperAdmin },
  });

  // Issue 24-hour session
  const payload: Omit<AdminSession, "iat" | "exp"> = {
    role: "admin",
    adminId: admin.id,
    username: admin.username,
    isSuperAdmin: admin.isSuperAdmin,
  };

  const token = await signToken(payload, ADMIN_SESSION_TTL);
  await setSessionCookie(COOKIE_ADMIN, token, ADMIN_SESSION_TTL);

  redirect("/admin");
}

/**
 * Admin Logout Action.
 */
export async function logoutAdminAction(): Promise<void> {
  const session = await getAdminSession();
  if (session) {
    await recordAuditLog({
      actorId: session.username,
      action: "admin_logout",
      targetType: "admin",
      targetId: session.adminId.toString(),
    });
  }
  await clearSessionCookie(COOKIE_ADMIN);
  redirect("/admin/login");
}

/**
 * Super Admin Action: Create a secondary admin (up to 2 secondary, 3 total).
 */
export async function createSecondaryAdminAction(
  prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await getAdminSession();
  if (!session || !session.isSuperAdmin) {
    return { error: "Unauthorized. Super admin access required." };
  }

  const [countResult] = await db
    .select({ count: count() })
    .from(admins)
    .where(eq(admins.isActive, true));

  const totalActive = countResult?.count ?? 0;
  if (totalActive >= 3) {
    return {
      error: "Maximum of 2 secondary admins (3 total active admins) already reached.",
    };
  }

  const parsed = SecondaryAdminSchema.safeParse({
    username: formData.get("username")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { username, password } = parsed.data;

  // Check if username already exists
  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (existing.length > 0) {
    return { error: `Admin username '${username}' already exists.` };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newAdmin] = await db
    .insert(admins)
    .values({
      username,
      passwordHash,
      isSuperAdmin: false,
      isActive: true,
    })
    .returning({ id: admins.id });

  await recordAuditLog({
    actorId: session.username,
    action: "create_secondary_admin",
    targetType: "admin",
    targetId: newAdmin.id.toString(),
    details: { createdUsername: username },
  });

  return { success: true };
}

/**
 * Super Admin Action: Deactivate secondary admin.
 */
export async function deactivateAdminAction(
  formData: FormData
): Promise<void> {
  const session = await getAdminSession();
  if (!session || !session.isSuperAdmin) {
    return;
  }

  const targetIdStr = formData.get("adminId")?.toString();
  const targetId = parseInt(targetIdStr ?? "0", 10);

  if (!targetId || targetId === session.adminId) {
    return;
  }

  await db
    .update(admins)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(admins.id, targetId));

  await recordAuditLog({
    actorId: session.username,
    action: "deactivate_admin",
    targetType: "admin",
    targetId: targetId.toString(),
  });
}
