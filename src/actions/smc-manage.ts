"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { smcUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export interface SmcManageState {
  error?: string;
  success?: boolean;
  rollNumber?: string;
  generatedPassword?: string;
}

/**
 * Creates a new SMC user account with a secure, random one-time password.
 */
export async function createSmcUserAction(
  prevState: SmcManageState,
  formData: FormData
): Promise<SmcManageState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const rawRoll = formData.get("rollNumber")?.toString().trim().toUpperCase() ?? "";
  if (!rawRoll || rawRoll.length < 2) {
    return { error: "Please provide a valid roll number." };
  }

  const [existing] = await db
    .select({ id: smcUsers.id })
    .from(smcUsers)
    .where(eq(smcUsers.rollNumber, rawRoll))
    .limit(1);

  if (existing) {
    return { error: `SMC user with roll number '${rawRoll}' already exists.` };
  }

  // Generate random 10-character alphanumeric password
  const oneTimePassword = crypto.randomBytes(5).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(oneTimePassword, 10);

  const [created] = await db
    .insert(smcUsers)
    .values({
      rollNumber: rawRoll,
      passwordHash,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: smcUsers.id });

  await recordAuditLog({
    actorId: session.username,
    action: "create_smc_user",
    targetType: "smc_user",
    targetId: created.id.toString(),
    details: { rollNumber: rawRoll },
  });

  revalidatePath("/admin/smc");
  revalidatePath("/admin");

  return {
    success: true,
    rollNumber: rawRoll,
    generatedPassword: oneTimePassword,
  };
}

/**
 * Resets an SMC user's password, generating a new one-time password.
 */
export async function resetSmcPasswordAction(
  prevState: SmcManageState,
  formData: FormData
): Promise<SmcManageState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const userId = parseInt(formData.get("userId")?.toString() ?? "0", 10);
  if (!userId) {
    return { error: "Invalid user ID." };
  }

  const [user] = await db
    .select()
    .from(smcUsers)
    .where(eq(smcUsers.id, userId))
    .limit(1);

  if (!user) {
    return { error: "SMC user not found." };
  }

  const oneTimePassword = crypto.randomBytes(5).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(oneTimePassword, 10);

  await db
    .update(smcUsers)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(smcUsers.id, userId));

  await recordAuditLog({
    actorId: session.username,
    action: "reset_smc_password",
    targetType: "smc_user",
    targetId: userId.toString(),
    details: { rollNumber: user.rollNumber },
  });

  revalidatePath("/admin/smc");

  return {
    success: true,
    rollNumber: user.rollNumber,
    generatedPassword: oneTimePassword,
  };
}

/**
 * Toggles an SMC user account between active and inactive.
 */
export async function toggleSmcStatusAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    return;
  }

  const userId = parseInt(formData.get("userId")?.toString() ?? "0", 10);
  if (!userId) return;

  const [user] = await db
    .select({ id: smcUsers.id, isActive: smcUsers.isActive, rollNumber: smcUsers.rollNumber })
    .from(smcUsers)
    .where(eq(smcUsers.id, userId))
    .limit(1);

  if (!user) return;

  const newStatus = !user.isActive;

  await db
    .update(smcUsers)
    .set({ isActive: newStatus, updatedAt: new Date() })
    .where(eq(smcUsers.id, userId));

  await recordAuditLog({
    actorId: session.username,
    action: newStatus ? "activate_smc_user" : "deactivate_smc_user",
    targetType: "smc_user",
    targetId: userId.toString(),
    details: { rollNumber: user.rollNumber, newStatus },
  });

  revalidatePath("/admin/smc");
  revalidatePath("/admin");
}
