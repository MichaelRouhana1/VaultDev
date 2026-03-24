/**
 * Shared secret for server-to-server calls to `/api/internal/security-audit`.
 * Prefer `INTERNAL_API_SECRET`; `INTERNAL_AUDIT_SECRET` is accepted for backward compatibility.
 *
 * **Verification:** Node routes use `internalApiSecretHeaderMatches` in `internal-api-secret-match.ts`
 * (`crypto.timingSafeEqual`). Edge middleware uses `timingSafeEqualStr` in `middleware.ts` (same-length
 * constant-time compare; `node:crypto` is unavailable on Edge).
 */
export const MOSAIK_INTERNAL_SECRET_HEADER = "x-mosaik-internal-secret" as const;

export function getInternalApiSecret(): string | undefined {
  const a = process.env.INTERNAL_API_SECRET?.trim();
  if (a) return a;
  return process.env.INTERNAL_AUDIT_SECRET?.trim();
}
