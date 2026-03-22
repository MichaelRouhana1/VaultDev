import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { buildContentSecurityPolicy } from "@/lib/constants/security-hosts";

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
      const secret = process.env.INTERNAL_AUDIT_SECRET;
      if (secret) {
        const origin = req.nextUrl.origin;
        void fetch(`${origin}/api/internal/security-audit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-audit-secret": secret,
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

  if (isAdminRoute(req) || req.nextUrl.pathname.startsWith("/api/upload")) {
    if (globalAdminLimiter) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
      try {
        const { success } = await globalAdminLimiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ success: false, error: "Too many requests. Please wait before trying again." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch {
        // allow if redis fails
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
