import { CreateProductForm } from "@/components/CreateProductForm";
import { getProductFormCategoryTree } from "@/actions/categories";
import { getCollectionsForProductForm } from "@/actions/collections";
import { getAdminStoreType } from "@/actions/admin-store";
import { getAttributesWithValues } from "@/actions/attributes";

export default async function CreateProductPage() {
  const storeType = await getAdminStoreType();
  const [streetwear, formal, women, colSw, colFo, colWo, attributesWithValues] = await Promise.all([
    getProductFormCategoryTree("streetwear"),
    getProductFormCategoryTree("formal"),
    getProductFormCategoryTree("women"),
    getCollectionsForProductForm("streetwear"),
    getCollectionsForProductForm("formal"),
    getCollectionsForProductForm("women"),
    getAttributesWithValues(),
  ]);
  const categoryTrees = { streetwear, formal, women } as const;
  const collectionsByStore = {
    streetwear: colSw.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    formal: colFo.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    women: colWo.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  } as const;
  return (
    <div className="w-full max-w-7xl">
      <h1 className="mb-6 text-2xl font-bold">Create Product</h1>
      <CreateProductForm
        categoryTrees={categoryTrees}
        collectionsByStore={collectionsByStore}
        attributesWithValues={attributesWithValues}
        initialStoreType={storeType}
      />
    </div>
  );
}
