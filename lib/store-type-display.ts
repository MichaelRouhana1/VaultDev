import type { ListingStore } from "@/lib/store-scope";

/**
 * Public-facing English label for listing store type.
 * URLs and DB enums remain `formal`; only the name shown to users is "Classic".
 */
export function storeTypeLabelEn(storeType: ListingStore): "Streetwear" | "Classic" | "Women" {
  if (storeType === "formal") return "Classic";
  if (storeType === "women") return "Women";
  return "Streetwear";
}

/** Admin tables where `storeType` may be `both` (categories/collections). */
export function adminListingStoreTypeLabel(storeType: string | null | undefined): string {
  const s = storeType ?? "streetwear";
  if (s === "both") return "Both (Men)";
  if (s === "formal" || s === "streetwear" || s === "women") return storeTypeLabelEn(s);
  return s;
}
