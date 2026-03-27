import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import type { ProductListingStore } from "@/lib/product-category-assign";

export function parseCollectionIdsFromFormData(formData: FormData): number[] {
  const raw = formData.getAll("collectionIds");
  const ids = new Set<number>();
  for (const v of raw) {
    const n = parseInt(String(v), 10);
    if (Number.isInteger(n) && n > 0) ids.add(n);
  }
  return [...ids];
}

/** Ensures every collection exists and applies to the product listing store (`both` or matching). */
export async function validateProductCollectionAssignments(
  productStore: ProductListingStore,
  collectionIds: number[],
): Promise<string | null> {
  const uniq = [...new Set(collectionIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (uniq.length === 0) return null;
  const rows = await db.select().from(collections).where(inArray(collections.id, uniq));
  if (rows.length !== uniq.length) return "One or more collections were not found.";
  for (const c of rows) {
    if (c.storeType !== "both" && c.storeType !== productStore) {
      const storeLabel = productStore === "formal" ? "Formal" : "Streetwear";
      return `Collection "${c.name}" is not available for ${storeLabel} products.`;
    }
  }
  return null;
}
