"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires `fbq('track','PageView')` on route changes (Next.js client-side navigations).
 * Initial loads are covered once `fbevents.js` has initialized `fbq`.
 * Staff routes are skipped so admin browsing is not counted as shopper traffic.
 */
export function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname.includes("/admin")) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 80;

    const t = window.setInterval(() => {
      if (cancelled) return;
      attempts++;
      if (typeof window.fbq === "function") {
        window.fbq("track", "PageView");
        window.clearInterval(t);
      } else if (attempts >= maxAttempts) {
        window.clearInterval(t);
      }
    }, 50);

    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pathname, searchParams]);

  return null;
}
