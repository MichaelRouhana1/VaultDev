/**
 * Structured audit logging for admin actions. Logs to console as JSON for now;
 * can be routed to a logging service in production.
 */

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "category.create"
  | "category.update"
  | "category.delete"
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
  | "account.delete";

export interface AuditEntry {
  timestamp: string;
  userId: string | null;
  action: AuditAction;
  target?: string;
  details?: Record<string, unknown>;
}

export function auditLog(entry: Omit<AuditEntry, "timestamp">): void {
  const full: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify({ audit: full }));
}
