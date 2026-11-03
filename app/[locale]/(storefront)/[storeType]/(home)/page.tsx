import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreBelowHero, StoreHero } from "@/components/storefront/StoreHome";
import { StoreBelowHeroSkeleton, StoreHeroSkeleton } from "@/components/storefront/StoreHomeSkeleton";
import { isListingStore, type ListingStore } from "@/lib/store-scope";

const HOME_META: Record<ListingStore, { title: string; description: string }> = {
  streetwear: {
    title: "Streetwear Essentials",
    description: "Modern urban culture, bold graphics, and premium everyday essentials. Your streetwear destination.",
  },
  formal: {
    title: "Classic Tailoring",
    description:
      "Bespoke tailoring, crisp shirts, and refined accessories for every occasion. Elevate your classic style.",
  },
  women: {
    title: "Women",
    description: "The VAULT women's collection. Modern essentials, statement pieces, and new arrivals.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ storeType: string }> }): Promise<Metadata> {
  const { storeType } = await params;
  const { title, description } = isListingStore(storeType)
    ? HOME_META[storeType]
    : { title: "Shop", description: "Shop our exclusive VAULT collections." };

  return {
    title: `VAULT | ${title}`,
    description,
    openGraph: {
      title: `VAULT | ${title}`,
      description,
      type: "website",
      siteName: "VAULT",
    },
    twitter: {
      card: "summary_large_image",
      title: `VAULT | ${title}`,
      description,
    },
  };
}

/**
 * Sync shell: hero and catalog each suspend, so client navigation can paint this page
 * before the database work finishes. `(home)` keeps this loading boundary off `/shop`.
 */
export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string; storeType: string }>;
}) {
  return (
    <div className="lg:pt-14">
      <Suspense fallback={<StoreHeroSkeleton />}>
        <StoreHero params={params} />
      </Suspense>
      <div
        id="store-landing-categories-sentinel"
        className="pointer-events-none h-0 w-full shrink-0"
        aria-hidden
      />
      <Suspense fallback={<StoreBelowHeroSkeleton />}>
        <StoreBelowHero params={params} />
      </Suspense>
    </div>
  );
}
