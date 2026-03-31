import { isMosaikLocale, type MosaikLocale } from "@/lib/i18n-locales";

/** Cookie set by middleware when the user browses a store route; used to redirect locale home on return visits. */
export const PREFERRED_STORE_COOKIE = "preferred_store";

export type StoreTypeSlug = "streetwear" | "formal";

export function isValidPreferredStore(value: string | undefined): value is StoreTypeSlug {
  return value === "streetwear" || value === "formal";
}

const DEFAULT_LOCALE: MosaikLocale = "en";

/**
 * Strip an optional `/{locale}` prefix (en|fr|ar) from the pathname.
 * Used for matching store segments and building locale-aware hrefs.
 */
export function stripLocaleFromPathname(pathname: string): {
  locale: MosaikLocale;
  pathnameSansLocale: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && isMosaikLocale(parts[0])) {
    const rest = parts.slice(1);
    return {
      locale: parts[0],
      pathnameSansLocale: rest.length ? `/${rest.join("/")}` : "/",
    };
  }
  return { locale: DEFAULT_LOCALE, pathnameSansLocale: pathname || "/" };
}

/** Derive store slug from request path, or null if not under a store route. */
export function storeSlugFromPathname(pathname: string): StoreTypeSlug | null {
  const { pathnameSansLocale } = stripLocaleFromPathname(pathname);
  if (pathnameSansLocale === "/streetwear" || pathnameSansLocale.startsWith("/streetwear/")) {
    return "streetwear";
  }
  if (pathnameSansLocale === "/formal" || pathnameSansLocale.startsWith("/formal/")) {
    return "formal";
  }
  return null;
}

/** Switch first store segment to the other store; preserve subpath when already on a store route. */
export function hrefForStore(pathname: string | null, target: StoreTypeSlug): string {
  const { locale, pathnameSansLocale } = stripLocaleFromPathname(pathname ?? "/");
  const parts = pathnameSansLocale.split("/").filter(Boolean);
  if (parts.length > 0 && isValidPreferredStore(parts[0])) {
    parts[0] = target;
    return `/${locale}/${parts.join("/")}`;
  }
  return `/${locale}/${target}`;
}
