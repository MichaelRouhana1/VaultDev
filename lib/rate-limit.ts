import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { MemorySlidingWindow } from "@/lib/memory-sliding-window";
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

// Common limited operations: 5 requests per 10 seconds (matches Upstash default below)
const memoryDefault = new MemorySlidingWindow(5, 10_000);
/** Stricter fallback when Redis errors (fail-closed bias per instance). */
const memoryDefaultDegraded = new MemorySlidingWindow(3, 10_000);

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

const memoryRegisterFromOrder = new MemorySlidingWindow(10, 60 * 60 * 1000);
const memoryRegisterFromOrderDegraded = new MemorySlidingWindow(5, 60 * 60 * 1000);

let warnedNoRedisConfigured = false;
let lastRedisErrorLogMs = 0;
const REDIS_ERROR_LOG_INTERVAL_MS = 60_000;

function shouldLogRedisErrorBurst(): boolean {
  const now = Date.now();
  if (now - lastRedisErrorLogMs >= REDIS_ERROR_LOG_INTERVAL_MS) {
    lastRedisErrorLogMs = now;
    return true;
  }
  return false;
}

export type RateLimitAuditOpts = {
  /** Included in AUTH_REDIS_ERROR when Redis throws */
  auditIp?: string;
};

async function logRedisFallback(
  reason: "redis_unconfigured" | "redis_error",
  details: { identifier: string; errorMessage?: string; auditIp?: string },
): Promise<void> {
  if (reason === "redis_unconfigured") {
    if (warnedNoRedisConfigured) return;
    warnedNoRedisConfigured = true;
    await logger.warn("rate_limit_using_memory_only_no_upstash", {
      note: "UPSTASH_REDIS_* unset; enforcing in-memory sliding window per server instance.",
      identifier: details.identifier,
      auditIp: details.auditIp ?? "",
    });
    return;
  }
  if (shouldLogRedisErrorBurst()) {
    await logger.warn("rate_limit_redis_error_strict_memory_fallback", {
      identifier: details.identifier,
      auditIp: details.auditIp ?? "",
      errorMessage: details.errorMessage ?? "",
    });
  }
}

export async function checkRateLimit(
  identifier: string,
  opts?: RateLimitAuditOpts,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (defaultLimiter) {
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
          fallback: "memory_strict",
        },
        ipAddress: opts?.auditIp ?? "",
      });
      await logRedisFallback("redis_error", {
        identifier,
        errorMessage: msg,
        auditIp: opts?.auditIp,
      });
      const { allowed, retryAfterMs } = memoryDefaultDegraded.consume(identifier);
      return { allowed, retryAfterMs };
    }
  }

  await logRedisFallback("redis_unconfigured", { identifier, auditIp: opts?.auditIp });
  return memoryDefault.consume(identifier);
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
 * Uses in-memory fallback when Redis is missing or throws (stricter window on error).
 */
export async function checkRegisterFromOrderLimit(ip: string): Promise<{ allowed: boolean }> {
  const normalized = ip.trim() || "unknown";

  if (registerFromOrderLimiter) {
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
        details: {
          layer: "registerFromOrder-limiter",
          error: msg,
          fallback: "memory_strict",
        },
        ipAddress: normalized,
      });
      await logRedisFallback("redis_error", {
        identifier: `registerFromOrder:${normalized}`,
        errorMessage: msg,
        auditIp: normalized,
      });
      const { allowed } = memoryRegisterFromOrderDegraded.consume(normalized);
      if (!allowed) {
        submitInternalSecurityAudit({
          action: "RATE_LIMIT_EXCEEDED",
          details: { path: "registerFromOrder", layer: "server_action", fallback: "memory" },
          ipAddress: normalized,
        });
      }
      return { allowed };
    }
  }

  await logRedisFallback("redis_unconfigured", {
    identifier: `registerFromOrder:${normalized}`,
    auditIp: normalized,
  });
  const { allowed } = memoryRegisterFromOrder.consume(normalized);
  if (!allowed) {
    submitInternalSecurityAudit({
      action: "RATE_LIMIT_EXCEEDED",
      details: { path: "registerFromOrder", layer: "server_action", fallback: "memory" },
      ipAddress: normalized,
    });
  }
  return { allowed };
}
