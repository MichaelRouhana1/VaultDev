import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLandingImages } from "@/actions/landing";
import { LandingAdminClient } from "@/components/LandingAdminClient";

export default async function AdminLandingPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const images = await getLandingImages();
  return <LandingAdminClient images={images} />;
}
