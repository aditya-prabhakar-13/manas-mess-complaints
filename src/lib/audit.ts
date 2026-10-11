/**
 * Administrative Audit Logging Utility.
 * Records immutable entries to the audit_log table.
 */
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export interface AuditLogOptions {
  actorId: string;       // Admin username or 'system'
  action: string;        // e.g. 'login', 'create_secondary_admin', 'soft_delete_complaint'
  targetType?: string;   // e.g. 'admin', 'complaint', 'smc_user', 'roster', 'gala_date', 'lockout'
  targetId?: string;     // ID or key of target entity
  details?: Record<string, unknown>;
  actorType?: "admin" | "system";
}

export async function recordAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorType: options.actorType ?? "admin",
      actorId: options.actorId,
      action: options.action,
      targetType: options.targetType ?? null,
      targetId: options.targetId ?? null,
      details: options.details ? JSON.stringify(options.details) : null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[audit] Failed to record audit log entry:", err);
  }
}
