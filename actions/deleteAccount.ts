"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { wishlists, orders, auditLogs } from "@/db/schema";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auditLog } from "@/lib/audit";

export async function deleteAccount() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const client = await clerkClient();
  let primaryEmailLower: string | null = null;
  try {
    const user = await client.users.getUser(userId);
    primaryEmailLower = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
  } catch {
    // Proceed with userId-only audit redaction if Clerk lookup fails
  }

  await db.transaction(async (tx) => {
    await tx.delete(wishlists).where(eq(wishlists.userId, userId));

    await tx
      .update(auditLogs)
      .set({
        userId: "[DELETED]",
        details: sql`COALESCE(${auditLogs.details}, '{}'::jsonb) || '{"subjectPiiRedacted":true}'::jsonb`,
      })
      .where(eq(auditLogs.userId, userId));

    await tx
      .update(auditLogs)
      .set({
        details: sql`COALESCE(${auditLogs.details}, '{}'::jsonb) || '{"subjectPiiRedacted":true,"target":"[DELETED]"}'::jsonb`,
      })
      .where(sql`(${auditLogs.details}->>'target') = ${userId}`);

    if (primaryEmailLower) {
      await tx
        .update(auditLogs)
        .set({
          details: sql`COALESCE(${auditLogs.details}, '{}'::jsonb) || '{"subjectPiiRedacted":true}'::jsonb`,
        })
        .where(sql`LOWER(COALESCE(${auditLogs.details}->>'email', '')) = ${primaryEmailLower}`);
    }

    await tx
      .update(orders)
      .set({
        userId: null,
        customerName: "Deleted User",
        guestEmail: null,
        phoneNumber: "Anonymized",
        addressLine1: "Anonymized",
        city: "Anonymized",
      })
      .where(eq(orders.userId, userId));
  });

  await client.users.deleteUser(userId);

  auditLog({ userId: null, action: "account.delete", target: userId });

  redirect({ href: "/", locale: await getLocale() });
}
