"use client";

import { usePathname } from "@/i18n/navigation";
import { isMosaikLocale } from "@/lib/i18n-locales";
import { SiteFooter } from "@/components/storefront/SiteFooter";

/** Hides the global footer on full-bleed flows (shop picker, checkout). */
export function LandingAwareSiteFooter() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  /** Entry screens: `/` (Men / Women) and `/men` (Streetwear / Classic), with or without a locale prefix. */
  const rest = segments.length > 0 && isMosaikLocale(segments[0]) ? segments.slice(1) : segments;
  const isShopPickerLanding = rest.length === 0 || (rest.length === 1 && rest[0] === "men");
  const isCheckoutSection =
    segments.length >= 2 &&
    isMosaikLocale(segments[0]) &&
    segments[1] === "checkout";
  if (isShopPickerLanding || isCheckoutSection) return null;
  return <SiteFooter />;
}
