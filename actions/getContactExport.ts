"use server";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdminAction } from "@/lib/security";

export type ContactExportResult =
  | { ok: true; emails: string[]; phones: string[] }
  | { ok: false; error: string };

/**
 * Unique guest emails and phone numbers from all orders (trimmed, non-empty).
 * Admin-only.
 */
export async function getContactExport(): Promise<ContactExportResult> {
  const gate = await requireAdminAction({ auditTarget: "contact.export" });
  if (!gate.authorized) {
    return { ok: false, error: gate.response.error };
  }

  const rows = await db
    .select({
      guestEmail: orders.guestEmail,
      phoneNumber: orders.phoneNumber,
    })
    .from(orders);

  const emailSet = new Map<string, string>(); // lowercase -> display value (first seen)
  const phoneSet = new Set<string>();

  for (const row of rows) {
    const email = row.guestEmail?.trim() ?? "";
    if (email.length > 0) {
      const key = email.toLowerCase();
      if (!emailSet.has(key)) {
        emailSet.set(key, email);
      }
    }

    const phone = row.phoneNumber?.trim() ?? "";
    if (phone.length > 0) {
      phoneSet.add(phone);
    }
  }

  const emails = Array.from(emailSet.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  const phones = Array.from(phoneSet).sort((a, b) => a.localeCompare(b));

  return { ok: true, emails, phones };
}
