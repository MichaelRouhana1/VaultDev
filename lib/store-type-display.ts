/**
 * Public-facing English label for listing store type.
 * URLs and DB enums remain `formal`; only the name shown to users is "Classic".
 */
export function storeTypeLabelEn(storeType: "streetwear" | "formal"): "Streetwear" | "Classic" {
  return storeType === "formal" ? "Classic" : "Streetwear";
}

/** Admin tables where `storeType` may be `both` (categories/collections). */
export function adminListingStoreTypeLabel(storeType: string | null | undefined): string {
  const s = storeType ?? "streetwear";
  if (s === "both") return "Both";
  if (s === "formal" || s === "streetwear") return storeTypeLabelEn(s);
  return s;
}
