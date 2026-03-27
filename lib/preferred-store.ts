/** Cookie set by middleware when the user browses `/streetwear` or `/formal`; used to redirect `/` on return visits. */
export const PREFERRED_STORE_COOKIE = "preferred_store";

export type StoreTypeSlug = "streetwear" | "formal";

export function isValidPreferredStore(value: string | undefined): value is StoreTypeSlug {
  return value === "streetwear" || value === "formal";
}

/** Derive store slug from request path, or null if not under a store route. */
export function storeSlugFromPathname(pathname: string): StoreTypeSlug | null {
  if (pathname === "/streetwear" || pathname.startsWith("/streetwear/")) return "streetwear";
  if (pathname === "/formal" || pathname.startsWith("/formal/")) return "formal";
  return null;
}

/** Switch first path segment to the other store; preserve subpath when already on a store route. */
export function hrefForStore(pathname: string | null, target: StoreTypeSlug): string {
  if (!pathname || pathname === "/") return `/${target}`;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && isValidPreferredStore(parts[0])) {
    parts[0] = target;
    return `/${parts.join("/")}`;
  }
  return `/${target}`;
}
