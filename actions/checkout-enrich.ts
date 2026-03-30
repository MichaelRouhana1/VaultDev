import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productColors, products } from "@/db/schema";
import type { CheckoutCartPayloadLine, CheckoutDisplayItem } from "@/lib/checkout-cart";

export type { CheckoutCartPayloadLine, CheckoutDisplayItem } from "@/lib/checkout-cart";

/**
 * Fill missing names/images from the DB. Preserves URL-provided `productName` / `productImage` / `productColor`.
 * Server-only — import from RSC / server actions, not from Client Components.
 */
export async function enrichCheckoutCartItems(
  lines: CheckoutCartPayloadLine[],
): Promise<CheckoutDisplayItem[]> {
  if (lines.length === 0) return [];

  const ids = [...new Set(lines.map((l) => l.productId))];
  const [productRows, colorRows] = await Promise.all([
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(inArray(products.id, ids)),
    db
      .select({
        productId: productColors.productId,
        imageUrls: productColors.imageUrls,
        id: productColors.id,
      })
      .from(productColors)
      .where(inArray(productColors.productId, ids))
      .orderBy(asc(productColors.productId), asc(productColors.id)),
  ]);

  const nameById = new Map(productRows.map((p) => [p.id, p.name]));
  const firstImageByProductId = new Map<number, string | null>();
  for (const r of colorRows) {
    if (firstImageByProductId.has(r.productId)) continue;
    const u = r.imageUrls?.[0];
    firstImageByProductId.set(r.productId, u?.trim() ? u : null);
  }

  return lines.map((line) => {
    const fromDbName = nameById.get(line.productId);
    const productName = line.productName?.trim() || fromDbName || "Unknown item";
    const urlImage = line.productImage?.trim();
    const fromDbImage = firstImageByProductId.get(line.productId) ?? null;
    const productImageUrl = urlImage || fromDbImage;
    const productColor = line.productColor?.trim() || null;

    return {
      productId: line.productId,
      size: line.size,
      quantity: line.quantity,
      priceAtPurchase: line.priceAtPurchase,
      productName,
      productImageUrl,
      productColor,
    };
  });
}
