import { getGenderLandingImages, getLandingImages } from "@/actions/landing";
import type { StoreGateProps } from "@/components/storefront/StoreGate";

const PEXELS = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop`;

const FALLBACK = {
  men: PEXELS(2897531),
  women: PEXELS(2235071),
  streetwear:
    "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  formal: PEXELS(3760854),
} as const;

/** Admin-managed images for both gate steps (Men / Women, then Streetwear / Classic), with Pexels fallbacks. */
export async function getStoreGateImages(): Promise<StoreGateProps["images"]> {
  const [styleRows, genderRows] = await Promise.all([getLandingImages(), getGenderLandingImages()]);
  const style = (key: "streetwear" | "formal") => styleRows.find((r) => r.storeType === key);
  const gender = (key: "men" | "women") => genderRows.find((r) => r.gender === key);

  return {
    men: { desktopSrc: gender("men")?.imageUrl ?? FALLBACK.men, mobileSrc: gender("men")?.mobileImageUrl },
    women: { desktopSrc: gender("women")?.imageUrl ?? FALLBACK.women, mobileSrc: gender("women")?.mobileImageUrl },
    streetwear: {
      desktopSrc: style("streetwear")?.imageUrl ?? FALLBACK.streetwear,
      mobileSrc: style("streetwear")?.mobileImageUrl,
    },
    formal: { desktopSrc: style("formal")?.imageUrl ?? FALLBACK.formal, mobileSrc: style("formal")?.mobileImageUrl },
  };
}
