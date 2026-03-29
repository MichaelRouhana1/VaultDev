import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/db";
import { categories, products, productVariants, productColors, subcategories } from "@/db/schema";
import { inArray, desc, eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ProductsTable } from "./ProductsTable";
import { getAllCategories } from "@/actions/categories";
import { getAllSubcategoriesAdmin } from "@/actions/subcategories";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";
import { buildProductSearchWhere } from "@/lib/product-search";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";
import { isSubcategoriesTableMissingError } from "@/lib/subcategories-table";

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
  const [allCategories, allSubs] = await Promise.all([getAllCategories(), getAllSubcategoriesAdmin()]);
  const categoryList = [
    ...allCategories
      .filter((c) => (c.storeType === adminStore || c.storeType === "both") && c.level !== "root")
      .map((c) => ({ id: c.id, slug: c.slug, label: c.label })),
    ...allSubs
      .filter((s) => s.storeType === adminStore || s.storeType === "both")
      .map((s) => ({ id: s.id, slug: s.slug, label: s.label })),
  ];
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
  const psub = alias(subcategories, "admin_product_sub");
  let slugRows: { productId: number; slug: string }[] = [];
  if (productIds.length > 0) {
    try {
      slugRows = await db
        .select({
          productId: products.id,
          slug: sql<string>`COALESCE(${psub.slug}, ${pmain.slug})`,
        })
        .from(products)
        .innerJoin(pmain, eq(products.mainCategoryId, pmain.id))
        .leftJoin(psub, eq(products.subcategoryId, psub.id))
        .where(inArray(products.id, productIds));
    } catch (e) {
      if (!isSubcategoriesTableMissingError(e)) throw e;
      slugRows = await db
        .select({
          productId: products.id,
          slug: pmain.slug,
        })
        .from(products)
        .innerJoin(pmain, eq(products.mainCategoryId, pmain.id))
        .where(inArray(products.id, productIds));
    }
  }
  const primarySlugByProductId: Record<number, string> = {};
  for (const row of slugRows) {
    if (primarySlugByProductId[row.productId] === undefined) {
      primarySlugByProductId[row.productId] = row.slug;
    }
  }

  const [variants, colorsList] =
    productIds.length > 0
      ? await Promise.all([
        db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds)),
        db
          .select()
          .from(productColors)
          .where(inArray(productColors.productId, productIds)),
      ])
      : [[], []];

  const colorById = Object.fromEntries(colorsList.map((c) => [c.id, c]));

  const stockByProduct = variants.reduce<Record<number, number>>((acc, v) => {
    acc[v.productId] = (acc[v.productId] ?? 0) + v.stock;
    return acc;
  }, {});

  const stockBySizeByProduct = variants.reduce<
    Record<number, Record<string, number>>
  >((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = {};
    acc[v.productId][v.size] = (acc[v.productId][v.size] ?? 0) + v.stock;
    return acc;
  }, {});

  type StockByColorRow = { colorName: string; stockBySize: Record<string, number> };
  const stockByColorByProduct: Record<number, StockByColorRow[]> = {};
  for (const v of variants) {
    const color = colorById[v.colorId];
    const colorName = color?.name ?? "—";
    if (!stockByColorByProduct[v.productId]) stockByColorByProduct[v.productId] = [];
    let row = stockByColorByProduct[v.productId].find((r) => r.colorName === colorName);
    if (!row) {
      row = { colorName, stockBySize: {} };
      stockByColorByProduct[v.productId].push(row);
    }
    row.stockBySize[v.size] = (row.stockBySize[v.size] ?? 0) + v.stock;
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
    totalStock: stockByProduct[p.id] ?? 0,
    stockBySize: stockBySizeByProduct[p.id] ?? {},
    stockByColor: stockByColorByProduct[p.id] ?? [],
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
        <Link
          href="/admin/products/new"
          className="px-6 py-2.5 bg-foreground text-background text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Add Product
        </Link>
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
