/**
 * Checkout cart payload parsing and shape helpers — safe for Client Components (no DB).
 * Keep `CheckoutCartItemBase` in sync with `placeOrder` cartItemSchema.
 */

export type CheckoutCartItemBase = {
  productId: number;
  size: string;
  quantity: number;
  priceAtPurchase: string;
};

/** Optional fields clients may send in `?cart=` JSON (ignored by `placeOrder` validation). */
export type CheckoutCartPayloadLine = CheckoutCartItemBase & {
  productName?: string;
  productImage?: string;
  productColor?: string;
};

export type CheckoutDisplayItem = CheckoutCartItemBase & {
  productName: string;
  productImageUrl: string | null;
  productColor: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Parse `?cart=` JSON lines; returns only well-formed lines (skips invalid entries). */
export function parseCheckoutCartPayload(raw: unknown): CheckoutCartPayloadLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CheckoutCartPayloadLine[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const productId = Number(row.productId);
    const size = typeof row.size === "string" ? row.size : "";
    const quantity = Number(row.quantity);
    const priceAtPurchase =
      typeof row.priceAtPurchase === "string" || typeof row.priceAtPurchase === "number"
        ? String(row.priceAtPurchase)
        : "";
    if (!Number.isFinite(productId) || !size || !Number.isFinite(quantity) || quantity < 1 || !priceAtPurchase) {
      continue;
    }
    out.push({
      productId,
      size,
      quantity,
      priceAtPurchase,
      ...(typeof row.productName === "string" && row.productName.trim()
        ? { productName: row.productName.trim() }
        : {}),
      ...(typeof row.productImage === "string" && row.productImage.trim()
        ? { productImage: row.productImage.trim() }
        : {}),
      ...(typeof row.productColor === "string" && row.productColor.trim()
        ? { productColor: row.productColor.trim() }
        : {}),
    });
  }
  return out;
}

/** Strip to fields accepted by `placeOrder` / cartItemSchema. */
export function toPlaceOrderCartItems(items: CheckoutDisplayItem[]): CheckoutCartItemBase[] {
  return items.map(({ productId, size, quantity, priceAtPurchase }) => ({
    productId,
    size,
    quantity,
    priceAtPurchase,
  }));
}
