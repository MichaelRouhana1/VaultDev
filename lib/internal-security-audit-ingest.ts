/**
 * Fire-and-forget POST to `/api/internal/security-audit` (Node + Edge safe).
 * Used when Redis/rate-limit infrastructure fails or limits are exceeded.
 */

function getAuditBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

export type InternalSecurityAuditPayload = {
  action: string;
  userId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
};

/** Persist via internal API when secret + base URL exist; always safe for Edge middleware. */
export function submitInternalSecurityAudit(payload: InternalSecurityAuditPayload): void {
  const secret = process.env.INTERNAL_AUDIT_SECRET;
  const base = getAuditBaseUrl();

  if (!secret || !base) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "internal_security_audit_skipped",
        reason: !secret ? "missing_INTERNAL_AUDIT_SECRET" : "missing_NEXT_PUBLIC_APP_URL_or_VERCEL_URL",
        action: payload.action,
        details: payload.details ?? null,
        ipAddress: payload.ipAddress ?? "",
      }),
    );
    return;
  }

  void fetch(`${base}/api/internal/security-audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-audit-secret": secret,
    },
    body: JSON.stringify({
      action: payload.action,
      userId: payload.userId ?? null,
      details: payload.details ?? null,
      ipAddress: payload.ipAddress ?? "",
    }),
  }).catch(() => {});
}

export function logAuthRedisError(context: Record<string, unknown>): void {
  console.warn(
    JSON.stringify({
      level: "error",
      severity: "high",
      message: "AUTH_REDIS_ERROR",
      ...context,
    }),
  );
}
