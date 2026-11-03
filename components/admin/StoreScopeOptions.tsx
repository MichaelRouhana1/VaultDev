import { STORE_SCOPE_VALUES } from "@/lib/store-scope";
import { adminListingStoreTypeLabel } from "@/lib/store-type-display";

/** `<option>`s for admin store-scope selects (categories, collections, hero, look). */
export function StoreScopeOptions() {
  return (
    <>
      {STORE_SCOPE_VALUES.map((value) => (
        <option key={value} value={value}>
          {adminListingStoreTypeLabel(value)}
        </option>
      ))}
    </>
  );
}
