import type { StoreTypeSlug } from "@/lib/preferred-store";

/** Pathname from `usePathname()` (no locale prefix). */
export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** First path segment is the store (e.g. `/streetwear/shop` → streetwear). */
export function storeSectionFromPathname(pathname: string | null | undefined): StoreTypeSlug | null {
  const parts = normalizePathname(pathname).split("/").filter(Boolean);
  const first = parts[0];
  if (first === "streetwear" || first === "formal") return first;
  return null;
}

export function isInStoreSection(pathname: string | null | undefined, store: StoreTypeSlug): boolean {
  return storeSectionFromPathname(pathname) === store;
}

/** Exactly `/streetwear` or `/formal` (store landing; no `/shop`, product, etc.). */
export function isStrictStoreLanding(pathname: string | null | undefined): boolean {
  const p = normalizePathname(pathname);
  return p === "/streetwear" || p === "/formal";
}
