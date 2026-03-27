import { CreateProductForm } from "@/components/CreateProductForm";
import { getProductFormCategoryTree } from "@/actions/categories";
import { getCollectionsForProductForm } from "@/actions/collections";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function CreateProductPage() {
  const storeType = await getAdminStoreType();
  const [streetwear, formal, colSw, colFo] = await Promise.all([
    getProductFormCategoryTree("streetwear"),
    getProductFormCategoryTree("formal"),
    getCollectionsForProductForm("streetwear"),
    getCollectionsForProductForm("formal"),
  ]);
  const categoryTrees = { streetwear, formal } as const;
  const collectionsByStore = {
    streetwear: colSw.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    formal: colFo.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  } as const;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Product</h1>
      <CreateProductForm
        categoryTrees={categoryTrees}
        collectionsByStore={collectionsByStore}
        initialStoreType={storeType}
      />
    </div>
  );
}
