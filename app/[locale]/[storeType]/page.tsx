import { getHeroImages } from "@/actions/hero";
import { getLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { getCategoriesForHome, getStoreCategorySlugs } from "@/actions/categories";
import { getHomeDiscoverProductsWithFirstImage } from "@/actions/storefront-products";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import { notFound } from "next/navigation";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HeroFallback } from "@/components/storefront/HeroFallback";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { LookbookSection } from "@/components/storefront/LookbookSection";
import { ProductDiscovery } from "@/components/storefront/ProductDiscovery";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ storeType: string }> }): Promise<Metadata> {
  const { storeType } = await params;
  const isStreetwear = storeType === "streetwear";
  const title = isStreetwear ? "Streetwear Essentials" : storeType === "formal" ? "Formal Tailoring" : "Shop";
  const description = isStreetwear
    ? "Modern urban culture, bold graphics, and premium everyday essentials. Your streetwear destination."
    : storeType === "formal"
      ? "Bespoke tailoring, crisp shirts, and refined accessories for every occasion. Elevate your formal style."
      : "Shop our exclusive VAULT collections.";

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
    }
  };
}

const PEXELS = (id: number, w = 800, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string; storeType: string }>;
}) {
  const { storeType, locale: localeParam } = await params;
  if (storeType !== "streetwear" && storeType !== "formal") return notFound();

  const locale = storefrontLocaleFromParam(localeParam);

  const [productListWithImages, heroImages, lookbookItems, lookbookSectionVisible, homeCategories, storeSlugs] =
    await Promise.all([
      getHomeDiscoverProductsWithFirstImage(storeType as "streetwear" | "formal", locale),
      getHeroImages(storeType),
      getLookbookItems(storeType),
      getLookbookSectionVisible(),
      getCategoriesForHome(storeType),
      getStoreCategorySlugs(storeType),
    ]);

  const discoverProducts = productListWithImages.map((p) => {
    const imageUrls = p.firstImageUrl ? [p.firstImageUrl] : [];
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: typeof p.price === "string" ? p.price : String(p.price),
      displayPrice: getProductDisplayPrice(p),
      onSale: isProductOnSale(p),
      percentOff: getProductDiscountPercent(p),
      storeType: p.storeType,
      images: imageUrls,
    };
  });

  return (
    <div className="lg:pt-14">
      {/* Hero */}
      {heroImages.length > 0 ? (
        <HeroCarousel images={heroImages} />
      ) : (
        <HeroFallback storeType={storeType} fallbackImage={PEXELS(3748221, 1920, 1080)} />
      )}

      {/* Mobile navbar: Intersection/scroll target — top of categories (after hero). See NavbarClient. */}
      <div
        id="store-landing-categories-sentinel"
        className="pointer-events-none h-0 w-full shrink-0"
        aria-hidden
      />

      {/* Category Grid */}
      <CategoryGrid categories={homeCategories} storeSlugs={storeSlugs} storeType={storeType} />

      {/* Lookbook */}
      {lookbookSectionVisible && <LookbookSection items={lookbookItems} />}

      {/* Product Discovery */}
      <ProductDiscovery products={discoverProducts} currentStoreType={storeType} fallbackImage={PEXELS(708440, 440, 660)} />

      {/* Newsletter */}
      <NewsletterForm />
    </div>
  );
}
