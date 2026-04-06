"use client";

import { usePathname } from "@/i18n/navigation";
import { isMosaikLocale } from "@/lib/i18n-locales";
import { SiteFooter } from "@/components/storefront/SiteFooter";

/** Hides the global footer on full-bleed flows (shop picker, checkout). */
export function LandingAwareSiteFooter() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const isShopPickerLanding = segments.length === 1 && isMosaikLocale(segments[0]);
  const isCheckoutSection =
    segments.length >= 2 &&
    isMosaikLocale(segments[0]) &&
    segments[1] === "checkout";
  if (isShopPickerLanding || isCheckoutSection) return null;
  return <SiteFooter />;
}
