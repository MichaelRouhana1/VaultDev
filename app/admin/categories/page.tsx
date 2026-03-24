import { getAllCategories } from "@/actions/categories";
import { CategoriesAdminClient } from "@/components/CategoriesAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const allCategories = await getAllCategories();
  const storeType = await getAdminStoreType();
  const categories = allCategories.filter((c) => c.storeType === storeType || c.storeType === "both");

  return <CategoriesAdminClient categories={categories} initialStoreType={storeType} />;
}
