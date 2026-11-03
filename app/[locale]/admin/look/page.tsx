import { getAllLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { LookAdminClient } from "@/components/admin/LookAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";
import { storeRowMatches } from "@/lib/store-scope";

export default async function AdminLookPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();

  const [allItems, sectionVisible] = await Promise.all([
    getAllLookbookItems(),
    getLookbookSectionVisible(),
  ]);

  const items = allItems.filter((img) => storeRowMatches(img.storeType, storeType));

  return <LookAdminClient items={items} sectionVisible={sectionVisible} initialStoreType={storeType} />;
}
