/** Shared labels / styles for Security Logs UI (server + client safe). */

export const AUDIT_LOG_ALL = "__all__";

export const AUDIT_LOG_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: AUDIT_LOG_ALL, label: "All events" },
  { value: "FAILED_LOGIN", label: "Failed login" },
  { value: "AUTH_FAILED_ADMIN", label: "Admin access denied" },
  { value: "BULK_DISCOUNT", label: "Bulk discount" },
  { value: "STOCK_OVERRIDE", label: "Stock override" },
  { value: "RETENTION_CLEANUP", label: "Retention cleanup" },
];

export function getAuditActionBadgeClass(action: string): string {
  switch (action) {
    case "FAILED_LOGIN":
    case "AUTH_FAILED_ADMIN":
    case "RATE_LIMIT_EXCEEDED":
      return "bg-destructive/15 text-destructive border border-destructive/30";
    case "AUTH_REDIS_ERROR":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35";
    case "BULK_DISCOUNT":
    case "STOCK_OVERRIDE":
    case "RETENTION_CLEANUP":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/35";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function getAuditActionLabel(
  action: string,
  details: Record<string, unknown> | null | undefined,
): string {
  const op = details && typeof details.operation === "string" ? details.operation : null;
  if (action === "BULK_DISCOUNT" && op) {
    const map: Record<string, string> = {
      apply: "Bulk discount applied",
      remove: "Bulk discount removed",
      clear_expired: "Expired sales cleared",
    };
    return map[op] ?? "Bulk discount";
  }
  const staticLabels: Record<string, string> = {
    FAILED_LOGIN: "Failed login",
    AUTH_FAILED_ADMIN: "Admin access denied",
    BULK_DISCOUNT: "Bulk discount",
    STOCK_OVERRIDE: "Manual stock change",
    RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
    AUTH_REDIS_ERROR: "Rate limit (Redis) error",
    RETENTION_CLEANUP: "Retention cleanup (pruned old logs)",
  };
  return staticLabels[action] ?? action.replace(/_/g, " ");
}
