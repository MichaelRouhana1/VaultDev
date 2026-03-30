/**
 * Structured audit logging: JSON to console + persisted rows in `audit_logs` for the admin Security Logs UI.
 */

import { headers } from "next/headers";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.archive"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "attribute.create"
  | "attribute.delete"
  | "attribute_value.create"
  | "attribute_value.delete"
  | "collection.create"
  | "collection.update"
  | "collection.delete"
  | "category.seed"
  | "category.seed_roots"
  | "order.status_update"
  | "bulk_discount.apply"
  | "bulk_discount.remove"
  | "bulk_discount.clear_expired"
  | "promo.create"
  | "promo.delete"
  | "promo.toggle_status"
  | "hero.add"
  | "hero.delete"
  | "lookbook.add"
  | "lookbook.update"
  | "lookbook.delete"
  | "landing.update"
  | "video.upload"
  | "video.delete"
  | "auth.failed_admin"
  | "account.delete"
  /** Manual inventory changes from the product editor (persisted as STOCK_OVERRIDE). */
  | "stock.override"
  /** Retention prune of audit_logs + read notifications (Security logs maintenance). */
  | "retention.cleanup"
  /** Bulk guest email/phone export from orders (admin Security Logs UI). */
  | "contact.export"
  /** PDP accordion copy (description extra, shipping, returns) per store. */
  | "product_page_copy.save";

export interface AuditEntry {
  timestamp: string;
  userId: string | null;
  action: AuditAction;
  target?: string;
  details?: Record<string, unknown>;
}

export async function getClientIpFromHeaders(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      ""
    );
  } catch {
    return "";
  }
}

/** Normalized `audit_logs.action` values for filtering and display. */
export type PersistedAuditAction =
  | "AUTH_FAILED_ADMIN"
  | "BULK_DISCOUNT"
  | "STOCK_OVERRIDE"
  | "FAILED_LOGIN"
  | string;

export function mapAuditEntryToPersistedRow(
  entry: Omit<AuditEntry, "timestamp">,
  ipAddress: string,
): {
  action: string;
  userId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string;
} {
  const details: Record<string, unknown> = {
    ...(entry.details ?? {}),
    target: entry.target,
    originalAction: entry.action,
  };

  let action: PersistedAuditAction;
  switch (entry.action) {
    case "auth.failed_admin":
      action = "AUTH_FAILED_ADMIN";
      break;
    case "contact.export":
      action = "ADMIN_EXPORTED_CONTACTS";
      break;
    case "bulk_discount.apply":
    case "bulk_discount.remove":
    case "bulk_discount.clear_expired":
      action = "BULK_DISCOUNT";
      details.operation = entry.action.replace("bulk_discount.", "");
      break;
    case "stock.override":
      action = "STOCK_OVERRIDE";
      break;
    default:
      action = entry.action.replace(/\./g, "_").toUpperCase();
  }

  return {
    action,
    userId: entry.userId,
    details: Object.keys(details).length ? details : null,
    ipAddress: ipAddress || "",
  };
}

export async function insertAuditLogRow(input: {
  action: string;
  userId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string;
}): Promise<void> {
  await db.insert(auditLogs).values({
    action: input.action,
    userId: input.userId,
    details: input.details,
    ipAddress: input.ipAddress || "",
  });
}

async function persistAuditEntry(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
  try {
    const ip = await getClientIpFromHeaders();
    const row = mapAuditEntryToPersistedRow(entry, ip);
    await insertAuditLogRow(row);
  } catch (e) {
    console.error("audit_logs insert failed", e);
  }
}

export function auditLog(entry: Omit<AuditEntry, "timestamp">): void {
  const full: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify({ audit: full }));
  void persistAuditEntry(entry);
}
