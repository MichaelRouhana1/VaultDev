import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/db";
import {
  categories,
  products,
  productVariants,
  productColors,
  productOptions,
  productOptionValues,
  variantOptionValues,
} from "@/db/schema";
import { inArray, desc, eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ProductsTable } from "./ProductsTable";
import type { AdminVariantStockRow } from "./StockHoverCell";
import { getAllCategories } from "@/actions/categories";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";
import { getProductPageAccordionCopy } from "@/actions/product-page-copy";
import { ProductPageCopyButton } from "@/components/admin/ProductPageCopyButton";
import { buildProductSearchWhere } from "@/lib/product-search";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";

type VariantAgg = {
  productId: number;
  sku: string | null;
  qty: number;
  legacySize: string;
  parts: { sort: number; name: string; value: string }[];
};

function displayLabelFor(a: VariantAgg): string {
  if (a.parts.length > 0) {
    const sorted = [...a.parts].sort(
      (x, y) => x.sort - y.sort || x.name.localeCompare(y.name) || x.value.localeCompare(y.value),
    );
    const seen = new Set<string>();
    const values: string[] = [];
    for (const p of sorted) {
      const key = `${p.sort}:${p.name}:${p.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(p.value);
    }
    return values.join(" / ");
  }
  if (a.sku?.trim()) return a.sku.trim();
  if (a.legacySize && a.legacySize !== "DEFAULT") return a.legacySize;
  return "Default";
}

function buildVariantRowsFromJoin(
  rows: {
    variantId: number;
    productId: number;
    sku: string | null;
    stockQuantity: number;
    stock: number;
    legacySize: string;
    optionName: string | null;
    optionSortOrder: number | null;
    optionValue: string | null;
  }[],
): Map<number, VariantAgg> {
  const byVariant = new Map<number, VariantAgg>();

  for (const r of rows) {
    let a = byVariant.get(r.variantId);
    if (!a) {
      a = {
        productId: r.productId,
        sku: r.sku,
        qty: r.stockQuantity ?? r.stock ?? 0,
        legacySize: r.legacySize,
        parts: [],
      };
      byVariant.set(r.variantId, a);
    }
    if (r.optionValue != null && r.optionSortOrder != null && r.optionName != null && r.optionName.trim() !== "") {
      a.parts.push({ sort: r.optionSortOrder, name: r.optionName.trim(), value: r.optionValue.trim() });
    }
  }

  return byVariant;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category;

  await requireAdmin();
  const adminStore = await getAdminStoreType();
  const productPageAccordionCopy = await getProductPageAccordionCopy(adminStore);
  const allCategories = await getAllCategories();
  const categoryList = allCategories
    .filter((c) => (c.storeType === adminStore || c.storeType === "both") && c.level !== "root")
    .map((c) => ({ id: c.id, slug: c.slug, label: c.label }));
  const categoryLabels = Object.fromEntries(categoryList.map((c) => [c.slug, c.label]));

  const whereConditions = [eq(products.storeType, adminStore)];
  if (category && category !== "all") {
    whereConditions.push(await conditionProductsMatchCategorySlug(category));
  }
  const ftsClause = buildProductSearchWhere(q ?? "");
  if (ftsClause) {
    whereConditions.push(ftsClause);
  }

  const productList = await db
    .select()
    .from(products)
    .where(and(...whereConditions))
    .orderBy(desc(products.id));

  const productIds = productList.map((p) => p.id);
  const pmain = alias(categories, "admin_product_main");
  let slugRows: { productId: number; slug: string }[] = [];
  if (productIds.length > 0) {
    slugRows = await db
      .select({
        productId: products.id,
        slug: pmain.slug,
      })
      .from(products)
      .innerJoin(pmain, eq(products.mainCategoryId, pmain.id))
      .where(inArray(products.id, productIds));
  }
  const primarySlugByProductId: Record<number, string> = {};
  for (const row of slugRows) {
    if (primarySlugByProductId[row.productId] === undefined) {
      primarySlugByProductId[row.productId] = row.slug;
    }
  }

  const [variantJoinRows, colorsList] =
    productIds.length > 0
      ? await Promise.all([
          db
            .select({
              variantId: productVariants.id,
              productId: productVariants.productId,
              sku: productVariants.sku,
              stockQuantity: productVariants.stockQuantity,
              stock: productVariants.stock,
              legacySize: productVariants.size,
              optionName: productOptions.name,
              optionSortOrder: productOptions.sortOrder,
              optionValue: productOptionValues.value,
            })
            .from(productVariants)
            .leftJoin(
              variantOptionValues,
              eq(variantOptionValues.productVariantId, productVariants.id),
            )
            .leftJoin(
              productOptionValues,
              eq(productOptionValues.id, variantOptionValues.productOptionValueId),
            )
            .leftJoin(productOptions, eq(productOptions.id, productOptionValues.productOptionId))
            .where(inArray(productVariants.productId, productIds)),
          db
            .select()
            .from(productColors)
            .where(inArray(productColors.productId, productIds)),
        ])
      : [[], []];

  const variantAggs = buildVariantRowsFromJoin(variantJoinRows);

  const variantsByProductId: Record<number, AdminVariantStockRow[]> = {};
  let totalStockByProduct: Record<number, number> = {};

  for (const [variantId, agg] of variantAggs) {
    const pid = agg.productId;
    const sortedParts = [...agg.parts].sort(
      (x, y) => x.sort - y.sort || x.name.localeCompare(y.name) || x.value.localeCompare(y.value),
    );
    const optionValues: Record<string, string> = {};
    const orderedOptionNames: string[] = [];
    const seenNames = new Set<string>();
    for (const p of sortedParts) {
      optionValues[p.name] = p.value;
      if (!seenNames.has(p.name)) {
        seenNames.add(p.name);
        orderedOptionNames.push(p.name);
      }
    }
    const row: AdminVariantStockRow = {
      variantId,
      displayLabel: displayLabelFor(agg),
      quantity: agg.qty,
      sku: agg.sku,
      optionValues,
      orderedOptionNames,
    };
    if (!variantsByProductId[pid]) variantsByProductId[pid] = [];
    variantsByProductId[pid].push(row);
    totalStockByProduct[pid] = (totalStockByProduct[pid] ?? 0) + agg.qty;
  }

  for (const pid of productIds) {
    variantsByProductId[pid]?.sort((a, b) => {
      const la = a.displayLabel.toLowerCase();
      const lb = b.displayLabel.toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      return a.variantId - b.variantId;
    });
  }

  const firstImageByProductId: Record<number, string> = {};
  for (const c of colorsList) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }

  const productsWithStock = productList.map((p) => ({
    ...p,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [],
    totalStock: totalStockByProduct[p.id] ?? 0,
    variantStockRows: variantsByProductId[p.id] ?? [],
    categoryLabel:
      categoryLabels[primarySlugByProductId[p.id] ?? ""] ?? primarySlugByProductId[p.id] ?? "—",
    colorLabel: (p as { color?: string | null }).color ?? deriveColor(p.name, p.description),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full capitalize">
            Managing: {adminStore}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ProductPageCopyButton storeType={adminStore} initialCopy={productPageAccordionCopy} />
          <Link
            href="/admin/products/new"
            className="px-6 py-2.5 bg-foreground text-background text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Add Product
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded" />}>
        <ProductsTable
          products={productsWithStock}
          initialQuery={q}
          initialCategory={category}
          categories={categoryList}
          storeType={adminStore}
        />
      </Suspense>
    </div>
  );
}

function deriveColor(name: string, description: string | null): string {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const colors = [
    "black",
    "white",
    "indigo",
    "charcoal",
    "camel",
    "navy",
    "grey",
    "gray",
    "blue",
    "beige",
  ];
  for (const c of colors) {
    if (text.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  return "—";
}
