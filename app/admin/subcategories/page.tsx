import { getCategories, getAllSubcategories } from "@/actions/categories";
import { SubcategoriesAdminClient } from "@/components/SubcategoriesAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminSubcategoriesPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();
  const [mainCategories, allSubs] = await Promise.all([
    getCategories(storeType),
    getAllSubcategories(storeType),
  ]);

  return (
    <SubcategoriesAdminClient
      subcategories={allSubs}
      mainCategories={mainCategories}
      initialStoreType={storeType}
    />
  );
}
