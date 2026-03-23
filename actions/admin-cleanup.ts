"use server";

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, notifications } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/security";

const AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const READ_NOTIFICATION_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export type RetentionCleanupResult =
  | {
      success: true;
      auditLogsDeleted: number;
      notificationsDeleted: number;
      auditCutoffIso: string;
      notificationCutoffIso: string;
    }
  | { success: false; error: string };

/**
 * Admin-only: prune old `audit_logs` (30d) and read `notifications` (14d).
 * Trigger manually from Security logs — no cron in this deployment.
 */
export async function runRetentionCleanup(): Promise<RetentionCleanupResult> {
  const { userId } = await requireAdmin();

  try {
    const auditCutoff = new Date(Date.now() - AUDIT_RETENTION_MS);
    const notificationCutoff = new Date(Date.now() - READ_NOTIFICATION_RETENTION_MS);

    const { auditLogsDeleted, notificationsDeleted } = await db.transaction(async (tx) => {
      const auditRows = await tx
        .delete(auditLogs)
        .where(lt(auditLogs.createdAt, auditCutoff))
        .returning({ id: auditLogs.id });

      const notifRows = await tx
        .delete(notifications)
        .where(
          and(eq(notifications.isRead, true), lt(notifications.createdAt, notificationCutoff)),
        )
        .returning({ id: notifications.id });

      return {
        auditLogsDeleted: auditRows.length,
        notificationsDeleted: notifRows.length,
      };
    });

    auditLog({
      userId,
      action: "retention.cleanup",
      target: "audit_logs+notifications",
      details: {
        auditLogsDeleted,
        notificationsDeleted,
        auditCutoff: auditCutoff.toISOString(),
        notificationCutoff: notificationCutoff.toISOString(),
      },
    });

    return {
      success: true,
      auditLogsDeleted,
      notificationsDeleted,
      auditCutoffIso: auditCutoff.toISOString(),
      notificationCutoffIso: notificationCutoff.toISOString(),
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Cleanup failed";
    return { success: false, error: message };
  }
}
