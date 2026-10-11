"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export interface ModerationActionState {
  error?: string;
  success?: boolean;
}

/**
 * Soft-deletes a complaint with a mandatory administrative justification.
 */
export async function softDeleteComplaintAction(
  prevState: ModerationActionState,
  formData: FormData
): Promise<ModerationActionState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const complaintId = parseInt(formData.get("complaintId")?.toString() ?? "0", 10);
  const reason = formData.get("reason")?.toString().trim() ?? "";

  if (!complaintId) {
    return { error: "Invalid complaint ID." };
  }

  if (!reason || reason.length < 5) {
    return { error: "Please provide a specific deletion reason (minimum 5 characters)." };
  }

  const [existing] = await db
    .select({ id: complaints.id })
    .from(complaints)
    .where(eq(complaints.id, complaintId))
    .limit(1);

  if (!existing) {
    return { error: "Complaint not found." };
  }

  await db
    .update(complaints)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: session.username,
      deletedReason: reason,
    })
    .where(eq(complaints.id, complaintId));

  await recordAuditLog({
    actorId: session.username,
    action: "soft_delete_complaint",
    targetType: "complaint",
    targetId: complaintId.toString(),
    details: { reason },
  });

  revalidatePath("/admin/complaints");
  revalidatePath("/smc/complaints");
  revalidatePath("/smc/archive");

  return { success: true };
}

/**
 * Restores a previously soft-deleted complaint.
 */
export async function restoreComplaintAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    return;
  }

  const complaintId = parseInt(formData.get("complaintId")?.toString() ?? "0", 10);
  if (!complaintId) return;

  await db
    .update(complaints)
    .set({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedReason: null,
    })
    .where(eq(complaints.id, complaintId));

  await recordAuditLog({
    actorId: session.username,
    action: "restore_complaint",
    targetType: "complaint",
    targetId: complaintId.toString(),
  });

  revalidatePath("/admin/complaints");
  revalidatePath("/smc/complaints");
  revalidatePath("/smc/archive");
}
