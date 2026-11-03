import { getAllCollections } from "@/actions/collections";
import { CollectionsAdminClient } from "@/components/CollectionsAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { storeRowMatches } from "@/lib/store-scope";

export default async function AdminCollectionsPage() {
  const all = await getAllCollections();
  const storeType = await getAdminStoreType();
  const collections = all.filter((c) => storeRowMatches(c.storeType, storeType));

  return <CollectionsAdminClient collections={collections} initialStoreType={storeType} />;
}
