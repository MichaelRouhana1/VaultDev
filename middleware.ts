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

  const cspHeader = buildContentSecurityPolicy(nonce);

  // Next.js needs the nonce explicitly set in the request headers
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

  // Uploads use authenticated server actions only (`actions/uploadProductImage.ts` etc.); no `/api/upload` route.
  if (isAdminRoute(req)) {
    if (globalAdminLimiter) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
      const path = req.nextUrl.pathname;
      try {
        const { success } = await globalAdminLimiter.limit(ip);
        if (!success) {
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
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
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
              degraded: true,
              note: "Rate limit could not be verified; request allowed (fail-open).",
            },
            ipAddress: ip,
          },
          { origin: req.nextUrl.origin },
        );
      }
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
