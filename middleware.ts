import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

  const scriptSrc = process.env.NODE_ENV === "production"
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' https://*.clerk.accounts.dev https://*.clerk.com`
    : `'self' 'nonce-${nonce}' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://images.pexels.com img.clerk.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.supabase.co wss://*.clerk.accounts.dev;
    frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
  `.replace(/\s{2,}/g, " ").trim();

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
