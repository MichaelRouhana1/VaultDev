import { Label } from "@/components/ui/label";
import { LISTING_STORES, type ListingStore } from "@/lib/store-scope";
import { storeTypeLabelEn } from "@/lib/store-type-display";

interface StoreTypeSelectProps {
    initialStoreType: ListingStore;
}

/** Listing store only (products). Category admin keeps a separate "both" option. */
export function StoreTypeSelect({ initialStoreType }: StoreTypeSelectProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor="storeType">Store Type</Label>
            <select
                id="storeType"
                name="storeType"
                required
                defaultValue={initialStoreType}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
                {LISTING_STORES.map((store) => (
                    <option key={store} value={store}>
                        {storeTypeLabelEn(store)}
                    </option>
                ))}
            </select>
        </div>
    );
}
