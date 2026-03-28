import { getCategories } from "@/actions/categories";
import { CategoriesAdminClient } from "@/components/CategoriesAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();
  const categories = await getCategories(storeType);

  return <CategoriesAdminClient categories={categories} initialStoreType={storeType} />;
}
