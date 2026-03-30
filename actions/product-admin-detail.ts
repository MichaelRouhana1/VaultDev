import { db } from "@/db";
import {
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

export type ProductAdminOptionDraft = { name: string; values: string[] };

export type ProductAdminVariantDraft = {
  sku: string;
  stock_quantity: number;
  price_override: number | null;
  optionValues: Record<string, string>;
};

export type ProductVariantFormInitial = {
  hasVariants: boolean;
  options: ProductAdminOptionDraft[];
  variantRows: ProductAdminVariantDraft[];
  defaultSku: string;
  defaultStockQuantity: number;
};

/**
 * Loads options + variant rows for the admin edit form (parity with create payload).
 */
export async function getProductVariantFormState(productId: number): Promise<ProductVariantFormInitial> {
  const [optionsRows, variants] = await Promise.all([
    db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, productId))
      .orderBy(asc(productOptions.sortOrder)),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)),
  ]);

  if (optionsRows.length === 0) {
    const v = variants[0];
    return {
      hasVariants: false,
      options: [],
      variantRows: [],
      defaultSku: v?.sku?.trim() ?? "",
      defaultStockQuantity: v?.stockQuantity ?? v?.stock ?? 0,
    };
  }

  const optionIds = optionsRows.map((o) => o.id);
  const allValues = await db
    .select()
    .from(productOptionValues)
    .where(inArray(productOptionValues.productOptionId, optionIds))
    .orderBy(asc(productOptionValues.sortOrder));

  const valuesByOptionId = new Map<number, typeof allValues>();
  for (const v of allValues) {
    const list = valuesByOptionId.get(v.productOptionId) ?? [];
    list.push(v);
    valuesByOptionId.set(v.productOptionId, list);
  }

  const options: ProductAdminOptionDraft[] = optionsRows.map((o) => ({
    name: o.name,
    values: (valuesByOptionId.get(o.id) ?? []).map((x) => x.value),
  }));

  const valueById = new Map(allValues.map((x) => [x.id, x] as const));
  const optionIdToName = new Map(optionsRows.map((o) => [o.id, o.name] as const));

  const variantIds = variants.map((v) => v.id);
  type VariantLinkRow = {
    productVariantId: number;
    productOptionValueId: number;
  };
  const linksByVariantId = new Map<number, VariantLinkRow[]>();
  if (variantIds.length > 0) {
    const allLinks = await db
      .select()
      .from(variantOptionValues)
      .where(inArray(variantOptionValues.productVariantId, variantIds));
    for (const l of allLinks) {
      const arr = linksByVariantId.get(l.productVariantId) ?? [];
      arr.push(l);
      linksByVariantId.set(l.productVariantId, arr);
    }
  }

  const variantRows: ProductAdminVariantDraft[] = [];
  for (const pv of variants) {
    const links = linksByVariantId.get(pv.id) ?? [];
    const optionValues: Record<string, string> = {};
    for (const l of links) {
      const ov = valueById.get(l.productOptionValueId);
      if (!ov) continue;
      const optName = optionIdToName.get(ov.productOptionId);
      if (optName) optionValues[optName] = ov.value;
    }
    const rawPo = pv.priceOverride;
    const po =
      rawPo != null && String(rawPo).trim() !== ""
        ? parseFloat(String(rawPo))
        : null;
    variantRows.push({
      sku: pv.sku?.trim() ?? "",
      stock_quantity: pv.stockQuantity ?? pv.stock ?? 0,
      price_override: po != null && Number.isFinite(po) && po > 0 ? po : null,
      optionValues,
    });
  }

  return {
    hasVariants: true,
    options,
    variantRows,
    defaultSku: "",
    defaultStockQuantity: 0,
  };
}
