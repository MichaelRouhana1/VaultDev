import type { Metadata } from "next";
import { StoreGate } from "@/components/storefront/StoreGate";
import { getStoreGateImages } from "@/lib/store-gate-images";

export const metadata: Metadata = {
  title: "VAULT | Men & Women",
  description: "Shop VAULT for men and women: streetwear essentials, classic tailoring, and the women's collection.",
  openGraph: {
    title: "VAULT | Men & Women",
    description: "Shop VAULT for men and women: streetwear essentials, classic tailoring, and the women's collection.",
    type: "website",
    siteName: "VAULT",
  },
};

export default async function RootHomePage() {
  const images = await getStoreGateImages();
  return <StoreGate initialStep="gender" images={images} />;
}
