import { isListingStore, type ListingStore } from "@/lib/store-scope";

/** Query param that limits `/search` to one listing store. Absent means every store. */
export const SEARCH_STORE_QUERY_KEY = "store";

export function parseSearchStoreParam(value: string | null | undefined): ListingStore | null {
  return isListingStore(value) ? value : null;
}

/** Locale-less href for the storefront search page. */
export function searchPath(options?: { store?: ListingStore | null; q?: string | null }): string {
  const params = new URLSearchParams();
  const q = options?.q?.trim();
  if (q) params.set("q", q);
  if (options?.store) params.set(SEARCH_STORE_QUERY_KEY, options.store);
  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}
