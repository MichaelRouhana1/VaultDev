import { getAllSubcategories } from "@/actions/subcategories";
import { SubcategoriesAdminClient } from "@/components/SubcategoriesAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminSubcategoriesPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();
  const allSubs = await getAllSubcategories(storeType);

  return <SubcategoriesAdminClient subcategories={allSubs} initialStoreType={storeType} />;
}
