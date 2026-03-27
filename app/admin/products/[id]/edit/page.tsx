import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { categories, productCategories, products, productVariants, productColors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EditProductForm } from "@/components/EditProductForm";
import { getCategories } from "@/actions/categories";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) notFound();

  const [variants, colors] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, productId)),
    db.select().from(productColors).where(eq(productColors.productId, productId)),
  ]);

  const storeType = await getAdminStoreType();
  const categoryRows = await getCategories(storeType);
  const firstColorImages = colors[0]?.imageUrls ?? [];
  const [catLink] = await db
    .select({ slug: categories.slug })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(productCategories.productId, productId))
    .limit(1);
  const productWithImages = {
    ...product,
    images: firstColorImages,
    categorySlug: catLink?.slug ?? null,
  };

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to products
      </Link>
      <h1 className="text-2xl font-bold mb-8">Edit Product</h1>
      <EditProductForm
        product={productWithImages}
        variants={variants}
        colors={colors}
        categories={categoryRows}
      />
    </div>
  );
}
