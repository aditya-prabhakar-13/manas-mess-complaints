"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lockouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

/**
 * Clears an active IP or Roll Number lockout immediately.
 */
export async function clearLockoutAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    return;
  }

  const lockoutId = parseInt(formData.get("lockoutId")?.toString() ?? "0", 10);
  if (!lockoutId) return;

  const [existing] = await db
    .select()
    .from(lockouts)
    .where(eq(lockouts.id, lockoutId))
    .limit(1);

  if (!existing) return;

  await db.delete(lockouts).where(eq(lockouts.id, lockoutId));

  await recordAuditLog({
    actorId: session.username,
    action: "clear_lockout",
    targetType: "lockout",
    targetId: lockoutId.toString(),
    details: {
      keyType: existing.keyType,
      keyValue: existing.keyValue,
      reason: existing.reason,
    },
  });

  revalidatePath("/admin/logs");
  revalidatePath("/admin");
}
