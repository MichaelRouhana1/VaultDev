import { getAllHeroImages } from "@/actions/hero";
import { HeroAdminClient } from "@/components/HeroAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminHeroPage() {
  await requireAdmin();

  const storeType = await getAdminStoreType();
  const allImages = await getAllHeroImages();

  // Filter by currently selected admin store (plus "both")
  const images = allImages.filter((img) => img.storeType === storeType || img.storeType === "both");

  return <HeroAdminClient images={images} initialStoreType={storeType} />;
}
