import type { Metadata } from "next";
import { StoreGate } from "@/components/storefront/StoreGate";
import { getStoreGateImages } from "@/lib/store-gate-images";

export const metadata: Metadata = {
  title: "VAULT | Men",
  description: "Men's streetwear essentials and classic tailoring. Choose your style.",
  openGraph: {
    title: "VAULT | Men",
    description: "Men's streetwear essentials and classic tailoring. Choose your style.",
    type: "website",
    siteName: "VAULT",
  },
};

export default async function MenStylePickerPage() {
  const images = await getStoreGateImages();
  return <StoreGate initialStep="style" images={images} />;
}
