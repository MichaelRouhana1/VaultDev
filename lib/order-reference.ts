/**
 * Customer-facing order number from the internal id (no store acronym — reads like a retail order #).
 * Example: `4` → `#000004`
 */
export function formatOrderReference(orderId: number): string {
  if (!Number.isFinite(orderId) || orderId < 1) {
    return "—";
  }
  const n = Math.trunc(orderId);
  return `#${String(n).padStart(6, "0")}`;
}
