import { timingSafeEqual } from "node:crypto";
import { getInternalApiSecret } from "@/lib/internal-api-secret";

/**
 * Constant-time comparison for `x-mosaik-internal-secret` (Node runtime only).
 * Edge middleware must use `timingSafeEqualStr` in `middleware.ts` instead—`node:crypto` is not available there.
 */
export function internalApiSecretHeaderMatches(provided: string | null | undefined): boolean {
  const secret = getInternalApiSecret();
  if (!secret || provided == null) return false;
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
