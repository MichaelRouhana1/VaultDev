"use server";

import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { Notification } from "@/db/schema";

export type AdminNotificationsResult =
  | { ok: true; items: Notification[] }
  | { ok: false; error: string };

export async function getAdminNotifications(): Promise<AdminNotificationsResult> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    return { ok: false, error: "Forbidden" };
  }

  const items = await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt));

  return { ok: true, items };
}

export async function markAllNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    return { ok: false, error: "Forbidden" };
  }

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { ok: true };
}
