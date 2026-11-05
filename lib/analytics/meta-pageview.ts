import { isMetaShop, metaShopsInOrder, type MetaShop } from "@/lib/analytics/meta-pixels";
import { isMosaikLocale } from "@/lib/i18n-locales";

/** Pathname with the locale prefix removed. `/en/women/shop` becomes `/women/shop`. */
export function storefrontPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (isMosaikLocale(parts[0])) parts.shift();
  return `/${parts.join("/")}`;
}

/**
 * Which pixels should receive PageView for this URL.
 * `null` means the bag is not hydrated yet, so the caller should wait.
 * Shared pages (gate, `/men`, success, info) return an empty list.
 */
export function shopsForPageView(input: {
  pathname: string;
  cartHydrated: boolean;
  cartShops: readonly MetaShop[];
}): MetaShop[] | null {
  const path = storefrontPathname(input.pathname);
  if (path === "/checkout/success" || path.startsWith("/checkout/success/")) return [];

  const first = path.split("/").filter(Boolean)[0];
  if (isMetaShop(first)) return [first];

  if (path === "/bag" || path === "/checkout") {
    if (!input.cartHydrated) return null;
    return metaShopsInOrder(input.cartShops);
  }

  return [];
}
