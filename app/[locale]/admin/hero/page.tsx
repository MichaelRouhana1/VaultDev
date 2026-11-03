import { getAllHeroImages } from "@/actions/hero";
import { HeroAdminClient } from "@/components/admin/HeroAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";
import { storeRowMatches } from "@/lib/store-scope";

export default async function AdminHeroPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();
  const allImages = await getAllHeroImages();

  // Filter by currently selected admin store (plus "both" for Men stores)
  const images = allImages.filter((img) => storeRowMatches(img.storeType, storeType));

  return <HeroAdminClient images={images} initialStoreType={storeType} />;
}
