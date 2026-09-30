/** Catalog and order amounts are stored in USD. Display currency is cosmetic. */
export const META_PIXEL_CURRENCY = "USD" as const;

export type MetaContent = {
  id: string;
  quantity: number;
  item_price: number;
};

export function metaPurchaseEventId(orderId: number): string {
  return `purchase_${orderId}`;
}

export function metaMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function metaLineValue(unitPriceUsd: string, quantity: number): number {
  const unit = parseFloat(unitPriceUsd);
  if (!Number.isFinite(unit) || quantity < 1) return 0;
  return metaMoney(unit * quantity);
}
