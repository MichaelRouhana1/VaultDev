import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type StorefrontCategoryRow = typeof categories.$inferSelect;

/** Use with `revalidateTag()` after admin category mutations (see `actions/categories.ts`). */
export const STOREFRONT_CATEGORIES_CACHE_TAG = "categories";

async function queryMainCategoriesForStore(storeType: string): Promise<StorefrontCategoryRow[]> {
  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.level, "main"),
        inArray(categories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

/**
 * Main categories for nav / shop (not store roots).
 * React `cache()` dedupes within one RSC render; `unstable_cache` warms Data Cache across requests until revalidated.
 */
export const getStoreCategories = cache(async (storeType: string): Promise<StorefrontCategoryRow[]> => {
  return unstable_cache(
    async () => queryMainCategoriesForStore(storeType),
    ["store-categories", storeType],
    { tags: [STOREFRONT_CATEGORIES_CACHE_TAG] },
  )();
});
