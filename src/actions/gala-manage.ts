"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { galaDates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export interface GalaActionState {
  error?: string;
  success?: boolean;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Adds an admin-configured Gala Dinner date.
 */
export async function addGalaDateAction(
  prevState: GalaActionState,
  formData: FormData
): Promise<GalaActionState> {
  const session = await getAdminSession();
  if (!session) {
    return { error: "Unauthorized. Admin session required." };
  }

  const rawDate = formData.get("galaDate")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;

  if (!DATE_REGEX.test(rawDate)) {
    return { error: "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-10-25)." };
  }

  const [existing] = await db
    .select({ id: galaDates.id })
    .from(galaDates)
    .where(eq(galaDates.galaDate, rawDate))
    .limit(1);

  if (existing) {
    return { error: `Gala Dinner date '${rawDate}' is already scheduled.` };
  }

  const [created] = await db
    .insert(galaDates)
    .values({
      galaDate: rawDate,
      description,
      createdAt: new Date(),
    })
    .returning({ id: galaDates.id });

  await recordAuditLog({
    actorId: session.username,
    action: "add_gala_date",
    targetType: "gala_date",
    targetId: created.id.toString(),
    details: { galaDate: rawDate, description },
  });

  revalidatePath("/admin/gala");
  revalidatePath("/admin");
  revalidatePath("/");

  return { success: true };
}

/**
 * Removes a scheduled Gala Dinner date.
 */
export async function removeGalaDateAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    return;
  }

  const dateId = parseInt(formData.get("dateId")?.toString() ?? "0", 10);
  if (!dateId) return;

  const [existing] = await db
    .select()
    .from(galaDates)
    .where(eq(galaDates.id, dateId))
    .limit(1);

  if (!existing) return;

  await db.delete(galaDates).where(eq(galaDates.id, dateId));

  await recordAuditLog({
    actorId: session.username,
    action: "remove_gala_date",
    targetType: "gala_date",
    targetId: dateId.toString(),
    details: { galaDate: existing.galaDate },
  });

  revalidatePath("/admin/gala");
  revalidatePath("/admin");
  revalidatePath("/");
}
