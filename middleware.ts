import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { buildContentSecurityPolicy } from "@/lib/constants/security-hosts";
import {
  logAuthRedisError,
  submitInternalSecurityAuditAsync,
} from "@/lib/internal-security-audit-ingest";
import { getInternalApiSecret, MOSAIK_INTERNAL_SECRET_HEADER } from "@/lib/internal-api-secret";
import { localeSegmentFromPathname } from "@/lib/i18n-locales";
import { routing } from "@/lib/i18n-routing";
import { MemorySlidingWindow } from "@/lib/memory-sliding-window";
import { loggerWarnStructured } from "@/lib/logger-structured";
import {
  isValidPreferredStore,
  PREFERRED_STORE_COOKIE,
  storeSlugFromPathname,
} from "@/lib/preferred-store";

/** Hostname substrings for organic search referrers — show store picker at locale home instead of cookie redirect. */
const SEARCH_ENGINE_HOST_MARKERS = [
  "google.",
  "bing.",
  "yahoo.",
  "duckduckgo.",
] as const;

function refererHostnameIsSearchEngine(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return SEARCH_ENGINE_HOST_MARKERS.some((marker) => h.includes(marker));
}

/**
 * True when the browser sent a Referer from a known search property (parsed hostname).
 * Null/empty referer → false (direct navigation keeps cookie redirect behavior).
 */
function refererIsFromSearchEngine(refererHeader: string | null): boolean {
  if (!refererHeader) return false;
  try {
    const { hostname } = new URL(refererHeader);
    return refererHostnameIsSearchEngine(hostname);
  } catch {
    return false;
  }
}

/** `/en`, `/fr`, `/ar` (optional trailing slash) — localized store picker entry. */
function isLocaleOnlyHome(pathname: string): boolean {
  return /^\/(en|fr|ar)\/?$/.test(pathname);
}

function isSitePasswordRequired(): boolean {
  return process.env.REQUIRE_SITE_PASSWORD === "true";
}

let warnedSiteAuthMisconfig = false;

/**
 * Same-origin server/middleware calls to `/api/internal/security-audit` use `x-mosaik-internal-secret`
 * only (no browser Basic header). Allow those when the secret matches so audit ingest still works.
 */
function shouldSkipSiteBasicAuth(req: NextRequest): boolean {
  if (req.nextUrl.pathname !== "/api/internal/security-audit" || req.method !== "POST") {
    return false;
  }
  const secret = getInternalApiSecret();
  if (!secret) return false;
  const headerSecret = req.headers.get(MOSAIK_INTERNAL_SECRET_HEADER);
  if (!headerSecret) return false;
  return timingSafeEqualStr(headerSecret, secret);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function verifySiteBasicAuth(req: NextRequest): boolean {
  const expectedUser = process.env.SITE_AUTH_USER ?? "";
  const expectedPass = process.env.SITE_AUTH_PASSWORD ?? "";
  if (!expectedUser || !expectedPass) {
    if (!warnedSiteAuthMisconfig) {
      warnedSiteAuthMisconfig = true;
      console.warn(
        "[middleware] REQUIRE_SITE_PASSWORD=true but SITE_AUTH_USER or SITE_AUTH_PASSWORD is empty; all requests denied.",
      );
    }
    return false;
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  return timingSafeEqualStr(user, expectedUser) && timingSafeEqualStr(pass, expectedPass);
}

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

const intlMiddleware = createMiddleware(routing);

/**
 * Path-based `<SignIn path={\`/${locale}/sign-in\`} />` / `<SignUp />` live under each locale segment.
 * Those routes must stay public: only `account` and `admin` use `auth.protect()` below. If you broaden
 * matchers, do not match `/{en|fr|ar}/sign-in` or `/{en|fr|ar}/sign-up`.
 */
const isProtectedRoute = createRouteMatcher([
  "/en/account(.*)",
  "/fr/account(.*)",
  "/ar/account(.*)",
]);
const isAdminRoute = createRouteMatcher([
  "/en/admin(.*)",
  "/fr/admin(.*)",
  "/ar/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isSitePasswordRequired() && !shouldSkipSiteBasicAuth(req)) {
    if (!verifySiteBasicAuth(req)) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }
  }

  const pathname = req.nextUrl.pathname;
  if (isLocaleOnlyHome(pathname) && (req.method === "GET" || req.method === "HEAD")) {
    const pref = req.cookies.get(PREFERRED_STORE_COOKIE)?.value;
    const fromSearch = refererIsFromSearchEngine(req.headers.get("referer"));
    if (isValidPreferredStore(pref) && !fromSearch) {
      const localeSeg = pathname.split("/").filter(Boolean)[0] ?? "en";
      return NextResponse.redirect(new URL(`/${localeSeg}/${pref}`, req.url));
    }
  }

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
      const homeLocale = localeSegmentFromPathname(pathname);
      return NextResponse.redirect(new URL(`/${homeLocale}`, req.url));
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
          note: "UPSTASH_REDIS_* unset; admin routes use in-memory limiter (10 req / 10s per IP per isolate).",
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

  // next-intl redirects unprefixed paths to `/{locale}/...`; that breaks `/api/*` and `/trpc/*`.
  if (pathname.startsWith("/api/") || pathname.startsWith("/trpc")) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(req);

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = buildContentSecurityPolicy(nonce);
  intlResponse.headers.set("Content-Security-Policy", cspHeader);

  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  response.headers.set("Content-Security-Policy", cspHeader);

  const storeFromPath = storeSlugFromPathname(pathname);
  if (storeFromPath) {
    response.cookies.set(PREFERRED_STORE_COOKIE, storeFromPath, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
});

/**
 * Skip middleware for mistaken `/{locale}/_next/...` URLs so `next.config` `beforeFiles` rewrites can map them to `/_next/...`.
 * Locales in `(?:en|fr|ar)` must match `MOSAIK_LOCALES` (static string required for Next compile-time `config` parsing).
 */
export const config = {
  matcher: [
    "/_next/static/:path*",
    "/_next/image",
    "/_next/font/:path*",
    "/_next/data/:path*",
    "/((?!(?:en|fr|ar)/_next|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
