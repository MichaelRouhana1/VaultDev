import { metaShopsInOrder, type MetaShop } from "@/lib/analytics/meta-pixels";

/** Catalog and order amounts are stored in USD. Display currency is cosmetic. */
export const META_PIXEL_CURRENCY = "USD" as const;

export type MetaContent = {
  id: string;
  quantity: number;
  item_price: number;
};

export type MetaPurchaseLine = {
  shop: MetaShop;
  id: string;
  quantity: number;
  /** Unit price in USD. */
  unitPrice: number;
};

export type MetaShopPurchase = {
  shop: MetaShop;
  value: number;
  contents: MetaContent[];
  contentIds: string[];
  numItems: number;
};

export function metaPurchaseEventId(orderId: number, shop: MetaShop): string {
  return `purchase_${orderId}_${shop}`;
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

function merchandiseCents(line: MetaPurchaseLine): number {
  if (line.quantity < 1) return 0;
  return Math.round(metaMoney(line.unitPrice) * line.quantity * 100);
}

/**
 * Split a charged order total across shops in proportion to merchandise.
 * That gives each shop its items, then a proportional share of discount and shipping.
 * Rounded cents are assigned by largest remainder so the shop values sum to the total.
 */
export function splitMetaPurchase(input: {
  lines: MetaPurchaseLine[];
  totalAmountUsd: number;
}): MetaShopPurchase[] {
  const buckets = new Map<MetaShop, MetaPurchaseLine[]>();
  for (const line of input.lines) {
    if (line.quantity < 1) continue;
    const list = buckets.get(line.shop) ?? [];
    list.push(line);
    buckets.set(line.shop, list);
  }

  const shops = metaShopsInOrder(buckets.keys());
  if (shops.length === 0) return [];

  const weights = shops.map((shop) =>
    (buckets.get(shop) ?? []).reduce((sum, line) => sum + merchandiseCents(line), 0),
  );
  const totalCents = Math.max(0, Math.round(metaMoney(input.totalAmountUsd) * 100));
  const allocated = allocateCents(totalCents, weights);

  return shops.map((shop, index) => {
    const lines = buckets.get(shop) ?? [];
    const contents: MetaContent[] = lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      item_price: metaMoney(line.unitPrice),
    }));
    return {
      shop,
      value: metaMoney(allocated[index] / 100),
      contents,
      contentIds: contents.map((line) => line.id),
      numItems: contents.reduce((sum, line) => sum + line.quantity, 0),
    };
  });
}

function allocateCents(totalCents: number, weights: number[]): number[] {
  const count = weights.length;
  if (count === 0 || totalCents === 0) return weights.map(() => 0);

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    const base = Math.floor(totalCents / count);
    let remainder = totalCents - base * count;
    return weights.map(() => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return base + extra;
    });
  }

  const raw = weights.map((weight) => (totalCents * weight) / weightSum);
  const floors = raw.map((value) => Math.floor(value));
  let remainder = totalCents - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - floors[index] }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  const cents = [...floors];
  for (let i = 0; i < order.length && remainder > 0; i++) {
    cents[order[i].index] += 1;
    remainder -= 1;
  }
  return cents;
}
