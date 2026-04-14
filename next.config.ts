import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getImageRemotePatterns } from "./lib/constants/security-hosts";
import { MOSAIK_LOCALES } from "./lib/i18n-locales";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Must be ≥ largest server-action multipart body. Vercel still caps total request size (~4.5MB);
       * dual-crop hero/lookbook JPEGs are downscaled client-side to fit. Keep in sync with
       * `MAX_SERVER_ACTION_BODY_BYTES` in `lib/security.ts`.
       */
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: getImageRemotePatterns(),
    /** User-uploaded SVGs from R2; only trusted admin uploads. */
    dangerouslyAllowSVG: true,
  },
  async rewrites() {
    return {
      beforeFiles: MOSAIK_LOCALES.map((locale) => ({
        source: `/${locale}/_next/:path*`,
        destination: "/_next/:path*",
      })),
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains; preload",
              },
            ]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
