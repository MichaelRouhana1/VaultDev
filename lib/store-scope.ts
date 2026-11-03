/** A storefront a product can list under (matches `product_listing_store_type`). */
export type ListingStore = "streetwear" | "formal" | "women";

/** Scope value on categories, collections, hero, lookbook, etc. (matches `store_type`). */
export type StoreScopeValue = ListingStore | "both";

export const LISTING_STORES: readonly ListingStore[] = ["streetwear", "formal", "women"];

export function isListingStore(value: string | null | undefined): value is ListingStore {
  return value === "streetwear" || value === "formal" || value === "women";
}

export const STORE_SCOPE_VALUES: readonly StoreScopeValue[] = ["streetwear", "formal", "women", "both"];

export function isStoreScopeValue(value: string | null | undefined): value is StoreScopeValue {
  return value === "both" || isListingStore(value);
}

/** `both` covers Men's streetwear + formal only, never Women. */
export function storeScopeFor(store: ListingStore): StoreScopeValue[] {
  return store === "women" ? ["women"] : [store, "both"];
}

export function storeRowMatches(rowStore: string | null | undefined, store: ListingStore): boolean {
  if (rowStore === store) return true;
  return rowStore === "both" && store !== "women";
}
