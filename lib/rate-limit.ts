import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  logAuthRedisError,
  submitInternalSecurityAudit,
} from "@/lib/internal-security-audit-ingest";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedisEnv =
  typeof url === "string" &&
  url.length > 0 &&
  typeof token === "string" &&
  token.length > 0;
const redis = hasRedisEnv ? new Redis({ url: url!, token: token! }) : null;

// Common limited operations: 5 requests per 10 seconds
const defaultLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 s"),
      prefix: "@upstash/ratelimit",
    })
  : null;

/** Stricter cap for guest activation / Clerk signup from order flow (per IP). */
const registerFromOrderLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "@upstash/ratelimit:registerFromOrder",
    })
  : null;

export type RateLimitAuditOpts = {
  /** Included in AUTH_REDIS_ERROR when Redis throws */
  auditIp?: string;
};

export async function checkRateLimit(
  identifier: string,
  opts?: RateLimitAuditOpts,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (!defaultLimiter) {
    return { allowed: true, retryAfterMs: 0 };
  }
  try {
    const { success, reset } = await defaultLimiter.limit(identifier);
    return { allowed: success, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.error("Rate limit error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    logAuthRedisError({
      layer: "lib/rate-limit",
      identifier,
      error: msg,
      ip: opts?.auditIp ?? "",
    });
    submitInternalSecurityAudit({
      action: "AUTH_REDIS_ERROR",
      details: {
        layer: "lib/rate-limit",
        identifier,
        error: msg,
      },
      ipAddress: opts?.auditIp ?? "",
    });
    return { allowed: true, retryAfterMs: 0 };
  }
}

export async function checkPlaceOrderLimit(identifier: string, opts?: RateLimitAuditOpts) {
  return checkRateLimit(`placeOrder:${identifier}`, opts);
}

export async function checkValidatePromoLimit(ip: string) {
  return checkRateLimit(`validatePromo:${ip}`, { auditIp: ip });
}

export async function checkToggleWishlistLimit(userId: string) {
  return checkRateLimit(`toggleWishlist:${userId}`);
}

export async function checkSensitiveOperationLimit(identifier: string, opts?: RateLimitAuditOpts) {
  return checkRateLimit(`sensitive:${identifier}`, opts);
}

/**
 * IP-based limit for `registerFromOrder`. On exceed, emits RATE_LIMIT_EXCEEDED audit.
 * On Redis error: fail-open + AUTH_REDIS_ERROR (same as shared limiter).
 */
export async function checkRegisterFromOrderLimit(ip: string): Promise<{ allowed: boolean }> {
  const normalized = ip.trim() || "unknown";
  if (!registerFromOrderLimiter) {
    return { allowed: true };
  }
  try {
    const { success } = await registerFromOrderLimiter.limit(normalized);
    if (!success) {
      submitInternalSecurityAudit({
        action: "RATE_LIMIT_EXCEEDED",
        details: { path: "registerFromOrder", layer: "server_action" },
        ipAddress: normalized,
      });
      return { allowed: false };
    }
    return { allowed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logAuthRedisError({
      layer: "registerFromOrder-limiter",
      error: msg,
      ip: normalized,
    });
    submitInternalSecurityAudit({
      action: "AUTH_REDIS_ERROR",
      details: { layer: "registerFromOrder-limiter", error: msg },
      ipAddress: normalized,
    });
    return { allowed: true };
  }
}
