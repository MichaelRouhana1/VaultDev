import { getGenderLandingImages, getLandingImages } from "@/actions/landing";
import { LandingAdminClient } from "@/components/admin/LandingAdminClient";
import { requireAdmin } from "@/lib/security";

export default async function AdminLandingPage() {
  await requireAdmin();

  const [images, genderImages] = await Promise.all([getLandingImages(), getGenderLandingImages()]);
  return <LandingAdminClient images={images} genderImages={genderImages} />;
}
