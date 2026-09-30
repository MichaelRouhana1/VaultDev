/**
 * Single source of truth for third-party hosts used in CSP and Next/Image allowlists.
 * Prefer env-driven values (Supabase, R2) so staging/prod stay aligned.
 */

/** Matches `images.remotePatterns` entries in next.config. */
export type ImageRemotePattern = {
  protocol: "https";
  hostname: string;
  pathname: string;
};

/** Clerk-hosted auth UI & API (covers dev + typical production). */
export const CLERK_HTTPS_ORIGINS = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
] as const;

/** Clerk WebSockets (sessions / realtime); production keys often use *.clerk.com frontends. */
export const CLERK_WSS_ORIGINS = ["wss://*.clerk.accounts.dev", "wss://*.clerk.com"] as const;

/** Clerk client telemetry (`connect-src` if omitted → console CSP errors). */
const CLERK_TELEMETRY_ORIGIN = "https://clerk-telemetry.com" as const;
/** Subdomains used by Clerk telemetry in some SDK paths. */
const CLERK_TELEMETRY_WILDCARD = "https://*.clerk-telemetry.com" as const;

/**
 * Stripe (Stripe.js, Hosted Checkout, 3DS / hooks).
 * Checkout is COD-only today; these origins keep CSP ready for card flows without widening to arbitrary third parties.
 * If you use Stripe Address Element with a Google Maps API key, also allow `https://maps.googleapis.com` in
 * `script-src` and `connect-src` (see Stripe CSP guide).
 * @see https://stripe.com/docs/security/guide#content-security-policy
 */
const STRIPE_SCRIPT_SRC = ["https://js.stripe.com", "https://*.js.stripe.com"] as const;
const STRIPE_CONNECT_SRC = [
  "https://api.stripe.com",
  "https://checkout.stripe.com",
  /** Device signals / risk (Stripe.js network calls). */
  "https://m.stripe.network",
] as const;
const STRIPE_FRAME_SRC = [
  "https://js.stripe.com",
  "https://*.js.stripe.com",
  /** 3D Secure and redirect-based payment methods. */
  "https://hooks.stripe.com",
  "https://checkout.stripe.com",
] as const;
const STRIPE_IMG_SRC = ["https://*.stripe.com"] as const;

/**
 * Cloudflare Turnstile (Clerk bot protection / CAPTCHA iframe + script).
 * @see https://developers.cloudflare.com/turnstile/reference/content-security-policy/
 */
const CLOUDFLARE_CHALLENGES_ORIGIN = "https://challenges.cloudflare.com" as const;

const PEXELS_HOST = "images.pexels.com" as const;
const CLERK_IMG_HOST = "img.clerk.com" as const;

function parseHttpsHostname(envValue: string | undefined): string | null {
  if (!envValue?.trim()) return null;
  try {
    const u = new URL(envValue.trim());
    if (u.protocol !== "https:") return null;
    return u.hostname;
  } catch {
    return null;
  }
}

/** Supabase project host from NEXT_PUBLIC_SUPABASE_URL, or null if unset/invalid. */
export function getSupabaseHostname(): string | null {
  return parseHttpsHostname(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** R2 public bucket host from NEXT_PUBLIC_R2_PUBLIC_URL, or null if unset/invalid. */
export function getR2PublicHostname(): string | null {
  return parseHttpsHostname(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
}

/**
 * S3-compatible API origins for presigned PUT uploads from the browser (`connect-src`).
 * AWS SDK / R2 often signs **virtual-hosted–style** URLs:
 * `https://<bucket>.<account-id>.r2.cloudflarestorage.com` (not only `https://<account-id>.r2...`).
 * Distinct from the public object URL host in `NEXT_PUBLIC_R2_PUBLIC_URL`.
 */
export function getR2S3ApiConnectOrigins(): string[] {
  const id = process.env.R2_ACCOUNT_ID?.trim();
  if (!id) return [];
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const origins = [`https://${id}.r2.cloudflarestorage.com`];
  if (bucket) {
    origins.push(`https://${bucket}.${id}.r2.cloudflarestorage.com`);
  }
  return origins;
}

/**
 * Custom Clerk Frontend API origin when using a Clerk **custom domain** (e.g. `https://clerk.example.com`).
 * Default `*.clerk.com` CSP entries do **not** cover `clerk.yourdomain.com`, so fetches to `/v1/environment` are blocked
 * unless this is set. Matches Clerk’s manual CSP guidance (`https://clerk.com/docs/security/clerk-csp`).
 *
 * Set to the same host shown under Clerk Dashboard → Configure → Domains → Frontend API (HTTPS URL, no trailing slash).
 */
export function getClerkFrontendApiOrigin(): string | null {
  const raw =
    process.env.CLERK_FRONTEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** `https://` + `wss://` forms of the custom FAPI host for `connect-src`. */
function getClerkCustomFrontendApiConnectSources(): string[] {
  const origin = getClerkFrontendApiOrigin();
  if (!origin) return [];
  const host = new URL(origin).hostname;
  return [origin, `wss://${host}`];
}


/** Upstash REST API origin (server-only today; listed so connect-src stays explicit if any client path appears). */
export function getUpstashRestOrigin(): string | null {
  return parseHttpsHostname(process.env.UPSTASH_REDIS_REST_URL);
}

/** https:// + host for CSP (exact project) or wildcard fallback when env missing. */
export function getSupabaseCspImgSources(): string[] {
  const h = getSupabaseHostname();
  if (h) return [`https://${h}`];
  return ["https://*.supabase.co"];
}

export function getSupabaseCspConnectSources(): string[] {
  const h = getSupabaseHostname();
  if (h) return [`https://${h}`, `wss://${h}`];
  return ["https://*.supabase.co", "wss://*.supabase.co"];
}

/**
 * next/image remotePatterns — keep pathname rules in sync with real object URLs.
 */
export function getImageRemotePatterns(): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [
    {
      protocol: "https",
      hostname: PEXELS_HOST,
      pathname: "/**",
    },
  ];

  const supa = getSupabaseHostname();
  if (supa) {
    patterns.push({
      protocol: "https",
      hostname: supa,
      pathname: "/storage/v1/object/public/**",
    });
  } else {
    patterns.push({
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/public/**",
    });
  }

  const r2 = getR2PublicHostname();
  if (r2) {
    patterns.push({
      protocol: "https",
      hostname: r2,
      pathname: "/**",
    });
  }

  return patterns;
}

function joinCspSources(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Full Content-Security-Policy header value (single line after collapse).
 *
 * **Scripts (production):** `'nonce-…'` + `'strict-dynamic'` so trusted entry scripts can load
 * dependencies; `'self'` and Clerk `https://*.clerk.*` remain as **legacy browser** fallbacks
 * (ignored by CSP3 browsers when `strict-dynamic` applies). Dev keeps `'unsafe-eval'` for
 * Next.js / Turbopack tooling.
 *
 * **Styles:** Next.js + Tailwind emit many inline styles (`style=""`, hydration). Clerk UI also
 * injects inline styles. Browsers do not apply nonces to attribute-based styles the way they do
 * for `<script nonce>`, so **`'unsafe-inline'` on `style-src` is required** for the app to render.
 * We omit `fonts.googleapis.com` / `fonts.gstatic.com`: `next/font` (Geist) self-hosts font files
 * under `'self'` (`/_next/static/...`).
 *
 * **Images:** `blob:` is required for admin image crop / preview (`URL.createObjectURL`). `data:`
 * is omitted unless we add inline data-URI images.
 *
 * **Connect:** Presigned R2 uploads may use `https://<bucket>.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
 * (virtual-hosted style). `connect-src` lists that origin when `R2_BUCKET_NAME` and `R2_ACCOUNT_ID` are set.
 *
 * **Frames:** Stripe (`js.stripe.com`, `hooks.stripe.com`, Checkout), Clerk hosted flows, Cloudflare Turnstile.
 *
 * **Analytics:** No third-party analytics scripts in this repo. If you add GTM, Plausible, Vercel Analytics, etc.,
 * extend `script-src` / `connect-src` / `img-src` here with those vendors’ documented hostnames (avoid `*`).
 *
 * **Clickjacking:** `frame-ancestors 'none'` (redundant with `X-Frame-Options: DENY` in
 * `next.config.ts` but enforced by CSP-aware clients).
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  // Nonce first, then strict-dynamic; host sources support legacy UAs that ignore strict-dynamic.
  const clerkCustomFapi = getClerkFrontendApiOrigin();

  const scriptSrc = isProduction
    ? joinCspSources([
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "'self'",
        ...(clerkCustomFapi ? [clerkCustomFapi] : []),
        ...CLERK_HTTPS_ORIGINS,
        CLOUDFLARE_CHALLENGES_ORIGIN,
        ...STRIPE_SCRIPT_SRC,
      ])
    : joinCspSources([
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "'unsafe-eval'",
        "'self'",
        ...(clerkCustomFapi ? [clerkCustomFapi] : []),
        ...CLERK_HTTPS_ORIGINS,
        CLOUDFLARE_CHALLENGES_ORIGIN,
        ...STRIPE_SCRIPT_SRC,
      ]);

  const r2Host = getR2PublicHostname();

  const imgSrc = joinCspSources([
    "'self'",
    "blob:",
    ...getSupabaseCspImgSources(),
    `https://${PEXELS_HOST}`,
    `https://${CLERK_IMG_HOST}`,
    ...(r2Host ? [`https://${r2Host}`] : []),
    ...STRIPE_IMG_SRC,
  ]);

  const connectParts: string[] = [
    "'self'",
    ...getClerkCustomFrontendApiConnectSources(),
    ...CLERK_HTTPS_ORIGINS,
    ...CLERK_WSS_ORIGINS,
    CLERK_TELEMETRY_ORIGIN,
    CLERK_TELEMETRY_WILDCARD,
    CLOUDFLARE_CHALLENGES_ORIGIN,
    ...getSupabaseCspConnectSources(),
  ];
  const upstash = getUpstashRestOrigin();
  if (upstash) {
    connectParts.push(upstash);
  }
  connectParts.push(...STRIPE_CONNECT_SRC);
  connectParts.push(...getR2S3ApiConnectOrigins());

  const connectSrc = joinCspSources(connectParts);

  const frameSrc = joinCspSources([
    "'self'",
    ...(clerkCustomFapi ? [clerkCustomFapi] : []),
    ...CLERK_HTTPS_ORIGINS,
    ...STRIPE_FRAME_SRC,
    CLOUDFLARE_CHALLENGES_ORIGIN,
  ]);

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src ${imgSrc};
    font-src 'self';
    connect-src ${connectSrc};
    frame-src ${frameSrc};
    frame-ancestors 'none';
    worker-src 'self' blob:;
    child-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return cspHeader;
}
