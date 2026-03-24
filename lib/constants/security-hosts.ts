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

export const CLERK_WSS_ORIGINS = ["wss://*.clerk.accounts.dev"] as const;

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
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  const scriptSrc = isProduction
    ? joinCspSources([
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...CLERK_HTTPS_ORIGINS,
      ])
    : joinCspSources([
        "'self'",
        `'nonce-${nonce}'`,
        "'unsafe-eval'",
        ...CLERK_HTTPS_ORIGINS,
      ]);

  const r2Host = getR2PublicHostname();

  const imgSrc = joinCspSources([
    "'self'",
    "blob:",
    "data:",
    ...getSupabaseCspImgSources(),
    `https://${PEXELS_HOST}`,
    `https://${CLERK_IMG_HOST}`,
    ...(r2Host ? [`https://${r2Host}`] : []),
  ]);

  const connectParts = [
    "'self'",
    ...CLERK_HTTPS_ORIGINS,
    ...CLERK_WSS_ORIGINS,
    ...getSupabaseCspConnectSources(),
  ];

  const connectSrc = joinCspSources(connectParts);

  const frameSrc = joinCspSources([
    "'self'",
    ...CLERK_HTTPS_ORIGINS,
    "https://js.stripe.com",
  ]);

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src ${imgSrc};
    font-src 'self' https://fonts.gstatic.com;
    connect-src ${connectSrc};
    frame-src ${frameSrc};
    worker-src 'self' blob:;
    child-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  return cspHeader;
}
