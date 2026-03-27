import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants, productColors, productCollections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EditProductForm } from "@/components/EditProductForm";
import { getProductFormCategoryTree } from "@/actions/categories";
import { getCollectionsForProductForm } from "@/actions/collections";

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

  const firstColorImages = colors[0]?.imageUrls ?? [];
  const [streetwear, formal, colSw, colFo, existingCollRows] = await Promise.all([
    getProductFormCategoryTree("streetwear"),
    getProductFormCategoryTree("formal"),
    getCollectionsForProductForm("streetwear"),
    getCollectionsForProductForm("formal"),
    db
      .select({ collectionId: productCollections.collectionId })
      .from(productCollections)
      .where(eq(productCollections.productId, productId)),
  ]);
  const categoryTrees = { streetwear, formal } as const;
  const collectionsByStore = {
    streetwear: colSw.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    formal: colFo.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  } as const;
  const initialCollectionIds = existingCollRows.map((r) => r.collectionId);
  const productWithImages = {
    ...product,
    images: firstColorImages,
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
        categoryTrees={categoryTrees}
        collectionsByStore={collectionsByStore}
        initialCollectionIds={initialCollectionIds}
      />
    </div>
  );
}
