import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { buildContentSecurityPolicy } from "@/lib/constants/security-hosts";
import {
  logAuthRedisError,
  submitInternalSecurityAuditAsync,
} from "@/lib/internal-security-audit-ingest";
import { getInternalApiSecret, MOSAIK_INTERNAL_SECRET_HEADER } from "@/lib/internal-api-secret";
import { MemorySlidingWindow } from "@/lib/memory-sliding-window";
import { loggerWarnStructured } from "@/lib/logger-structured";

/** Admin throughput when Upstash is unavailable (stricter than Redis 20/10s — 10 req / 10s per IP per isolate). */
const adminMemoryLimiter = new MemorySlidingWindow(10, 10_000);
let warnedMiddlewareAdminMemoryOnly = false;
let lastMiddlewareRedisErrorLogMs = 0;

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.error("Failed to initialize Redis in middleware:", e);
}

const globalAdminLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
  prefix: "@upstash/ratelimit:globalAdmin",
}) : null;

const isProtectedRoute = createRouteMatcher(["/account(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // CSP: see `buildContentSecurityPolicy` in `lib/constants/security-hosts.ts` (nonce, directives, comments).
  const cspHeader = buildContentSecurityPolicy(nonce);

  // Forward nonce for App Router + ClerkProvider (`app/layout.tsx` reads `x-nonce`).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  if (isProtectedRoute(req)) await auth.protect();

  if (isAdminRoute(req)) {
    await auth.protect();
    const { userId, sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "";
      const secret = getInternalApiSecret();
      if (secret) {
        const origin = req.nextUrl.origin;
        void fetch(`${origin}/api/internal/security-audit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [MOSAIK_INTERNAL_SECRET_HEADER]: secret,
          },
          body: JSON.stringify({
            action: "AUTH_FAILED_ADMIN",
            userId: userId ?? null,
            details: {
              path: req.nextUrl.pathname,
              reason: "insufficient_role",
            },
            ipAddress: ip,
          }),
        }).catch(() => {});
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Admin throughput: Upstash when configured; otherwise in-memory sliding window (per Edge isolate).
  if (isAdminRoute(req)) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";
    const path = req.nextUrl.pathname;
    let adminAllowed = true;

    if (globalAdminLimiter) {
      try {
        const { success } = await globalAdminLimiter.limit(ip);
        adminAllowed = success;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logAuthRedisError({
          layer: "middleware",
          path,
          sensitiveRoute: true,
          error: msg,
          ip,
        });
        await submitInternalSecurityAuditAsync(
          {
            action: "AUTH_REDIS_ERROR",
            details: {
              layer: "middleware",
              path,
              sensitiveRoute: true,
              routeGroup: "admin",
              error: msg,
              fallback: "memory",
              note: "Redis rate limit failed; enforced in-memory sliding window (10 req / 10s per IP per isolate).",
            },
            ipAddress: ip,
          },
          { origin: req.nextUrl.origin },
        );
        const now = Date.now();
        if (now - lastMiddlewareRedisErrorLogMs >= 60_000) {
          lastMiddlewareRedisErrorLogMs = now;
          loggerWarnStructured("middleware_admin_rate_limit_redis_error_memory_fallback", {
            path,
            ip,
            errorMessage: msg,
          });
        }
        adminAllowed = adminMemoryLimiter.consume(ip).allowed;
      }
    } else {
      if (!warnedMiddlewareAdminMemoryOnly) {
        warnedMiddlewareAdminMemoryOnly = true;
        loggerWarnStructured("middleware_admin_rate_limit_no_upstash_memory_only", {
          note: "UPSTASH_REDIS_* unset; admin routes use in-memory limiter (10 req / 10s per IP per Edge isolate).",
        });
      }
      adminAllowed = adminMemoryLimiter.consume(ip).allowed;
    }

    if (!adminAllowed) {
      await submitInternalSecurityAuditAsync(
        {
          action: "RATE_LIMIT_EXCEEDED",
          details: {
            path,
            layer: "middleware",
            routeGroup: "admin",
          },
          ipAddress: ip,
        },
        { origin: req.nextUrl.origin },
      );
      return new NextResponse(
        JSON.stringify({ success: false, error: "Too many requests. Please wait before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
