import { getAllCollections } from "@/actions/collections";
import { CollectionsAdminClient } from "@/components/CollectionsAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminCollectionsPage() {
  const all = await getAllCollections();
  const storeType = await getAdminStoreType();
  const collections = all.filter((c) => c.storeType === storeType || c.storeType === "both");

  return <CollectionsAdminClient collections={collections} initialStoreType={storeType} />;
}
