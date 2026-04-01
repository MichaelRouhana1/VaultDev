import { getLandingImages } from "@/actions/landing";
import { LandingAdminClient } from "@/components/admin/LandingAdminClient";
import { requireAdmin } from "@/lib/security";

export default async function AdminLandingPage() {
  await requireAdmin();

  const images = await getLandingImages();
  return <LandingAdminClient images={images} />;
}
