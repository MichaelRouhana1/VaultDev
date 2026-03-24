import { getAllLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { LookAdminClient } from "@/components/LookAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminLookPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();

  const [allItems, sectionVisible] = await Promise.all([
    getAllLookbookItems(),
    getLookbookSectionVisible(),
  ]);

  const items = allItems.filter((img) => img.storeType === storeType || img.storeType === "both");

  return <LookAdminClient items={items} sectionVisible={sectionVisible} initialStoreType={storeType} />;
}
