/**
 * Super Admin Bootstrap.
 * Seeds the super admin into the admins table from environment variables on first start/check.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";

export async function ensureSuperAdmin(): Promise<void> {
  const username = process.env.SUPER_ADMIN_USERNAME || "admin";
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SUPER_ADMIN_PASSWORD environment variable must be set in production."
      );
    }
    console.warn(
      "[admin-bootstrap] SUPER_ADMIN_PASSWORD not set. Using dev fallback password 'admin123'."
    );
  }

  const effectivePassword = password || "admin123";

  try {
    const existing = await db
      .select({ id: admins.id, username: admins.username })
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(effectivePassword, 10);
      await db.insert(admins).values({
        username,
        passwordHash,
        isSuperAdmin: true,
        isActive: true,
      });
      console.log(`[admin-bootstrap] Super admin '${username}' seeded successfully.`);
    }
  } catch (err) {
    console.warn("[admin-bootstrap] Error ensuring super admin (database may be offline during build):", err);
  }
}
