"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { Notification } from "@/db/schema";
import { requireAdminAction } from "@/lib/security";

export type AdminNotificationsResult =
  | { ok: true; items: Notification[] }
  | { ok: false; error: string };

export async function getAdminNotifications(): Promise<AdminNotificationsResult> {
  const gate = await requireAdminAction({ auditTarget: "admin.notifications.read" });
  if (!gate.authorized) {
    return { ok: false, error: gate.response.error };
  }

  const items = await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt));

  return { ok: true, items };
}

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "admin.notifications.mark_read" });
  if (!gate.authorized) {
    return { ok: false, error: gate.response.error };
  }

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { ok: true };
}
