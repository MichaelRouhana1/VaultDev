import { revalidateTag } from "next/cache";
import { STOREFRONT_CATEGORIES_CACHE_TAG } from "@/lib/storefront-categories";

/** Call after admin category create/update/delete so nav + Data Cache stay fresh. */
export function revalidateStorefrontCategoriesCache(): void {
  revalidateTag(STOREFRONT_CATEGORIES_CACHE_TAG);
}
