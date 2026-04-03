import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getImageRemotePatterns } from "./lib/constants/security-hosts";
import { MOSAIK_LOCALES } from "./lib/i18n-locales";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /** Must be ≥ multipart admin uploads (e.g. 5MB files + overhead); keep in sync with `MAX_SERVER_ACTION_BODY_BYTES`. */
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: getImageRemotePatterns(),
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
