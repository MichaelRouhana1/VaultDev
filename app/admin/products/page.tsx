import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants, productColors } from "@/db/schema";
import { inArray, desc, eq, and } from "drizzle-orm";
import { ProductsTable } from "./ProductsTable";
import { getCategories } from "@/actions/categories";
import { getAdminStoreType } from "@/actions/admin-store";
import { buildProductSearchWhere } from "@/lib/product-search";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category;

  const categories = await getCategories();
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.slug, c.label]));

  const adminStore = await getAdminStoreType();

  const whereConditions = [eq(products.storeType, adminStore)];
  if (category && category !== "all") {
    whereConditions.push(eq(products.categorySlug, category));
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
    categoryLabel: categoryLabels[p.categorySlug ?? ""] ?? p.categorySlug ?? p.category ?? "—",
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
          categories={categories}
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
