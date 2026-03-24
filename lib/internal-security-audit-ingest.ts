/**
 * Fire-and-forget POST to `/api/internal/security-audit` (Node + Edge safe).
 * Used when Redis/rate-limit infrastructure fails or limits are exceeded.
 */

import { getInternalApiSecret, MOSAIK_INTERNAL_SECRET_HEADER } from "@/lib/internal-api-secret";

function getAuditBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

/** Prefer request origin (middleware) so ingest works when public URL env is unset. */
function resolveAuditBaseUrl(originOverride?: string): string {
  const o = originOverride?.trim().replace(/\/$/, "");
  if (o) return o;
  return getAuditBaseUrl();
}

export type InternalSecurityAuditPayload = {
  action: string;
  userId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
};

export type InternalSecurityAuditOptions = {
  /** e.g. `req.nextUrl.origin` in middleware */
  origin?: string;
};

function auditSkipWarn(
  payload: InternalSecurityAuditPayload,
  reason: "missing_internal_api_secret" | "missing_audit_base_url",
): void {
  console.warn(
    JSON.stringify({
      level: "warn",
      message: "internal_security_audit_skipped",
      reason,
      action: payload.action,
      details: payload.details ?? null,
      ipAddress: payload.ipAddress ?? "",
    }),
  );
}

/** Fire-and-forget POST (server actions, lib/rate-limit). */
export function submitInternalSecurityAudit(
  payload: InternalSecurityAuditPayload,
  options?: InternalSecurityAuditOptions,
): void {
  const secret = getInternalApiSecret();
  const base = resolveAuditBaseUrl(options?.origin);

  if (!secret) {
    auditSkipWarn(payload, "missing_internal_api_secret");
    return;
  }
  if (!base) {
    auditSkipWarn(payload, "missing_audit_base_url");
    return;
  }

  void fetch(`${base}/api/internal/security-audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [MOSAIK_INTERNAL_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({
      action: payload.action,
      userId: payload.userId ?? null,
      details: payload.details ?? null,
      ipAddress: payload.ipAddress ?? "",
    }),
  }).catch(() => {});
}

/**
 * Awaited ingest for Edge middleware: ensures `RATE_LIMIT_EXCEEDED` is sent before returning 429
 * (fire-and-forget fetches may be dropped when the response completes).
 */
export async function submitInternalSecurityAuditAsync(
  payload: InternalSecurityAuditPayload,
  options?: InternalSecurityAuditOptions,
): Promise<void> {
  const secret = getInternalApiSecret();
  const base = resolveAuditBaseUrl(options?.origin);

  if (!secret) {
    auditSkipWarn(payload, "missing_internal_api_secret");
    return;
  }
  if (!base) {
    auditSkipWarn(payload, "missing_audit_base_url");
    return;
  }

  try {
    await fetch(`${base}/api/internal/security-audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [MOSAIK_INTERNAL_SECRET_HEADER]: secret,
      },
      body: JSON.stringify({
        action: payload.action,
        userId: payload.userId ?? null,
        details: payload.details ?? null,
        ipAddress: payload.ipAddress ?? "",
      }),
    });
  } catch {
    // best-effort
  }
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
