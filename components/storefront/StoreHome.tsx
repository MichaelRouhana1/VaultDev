import { getHeroImages } from "@/actions/hero";
import { getLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { getCategoriesForHome, getStoreCategorySlugs } from "@/actions/categories";
import { getHomeDiscoverProductsWithFirstImage } from "@/actions/storefront-products";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountSaveAmountNumber } from "@/lib/utils";
import { notFound } from "next/navigation";
import { HeroCarousel } from "@/components/HeroCarousel";
import { HeroFallback } from "@/components/storefront/HeroFallback";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { LookbookSection } from "@/components/storefront/LookbookSection";
import { ProductDiscovery } from "@/components/storefront/ProductDiscovery";
import { isListingStore, type ListingStore } from "@/lib/store-scope";

const PEXELS = (id: number, w = 800, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

async function readStore(params: Promise<{ locale: string; storeType: string }>): Promise<{
  storeType: ListingStore;
  locale: ReturnType<typeof storefrontLocaleFromParam>;
}> {
  const { storeType, locale: localeParam } = await params;
  if (!isListingStore(storeType)) notFound();
  return { storeType, locale: storefrontLocaleFromParam(localeParam) };
}

/** Hero is its own Suspense boundary so the campaign can paint before the catalog queries finish. */
export async function StoreHero({
  params,
}: {
  params: Promise<{ locale: string; storeType: string }>;
}) {
  const { storeType } = await readStore(params);
  const heroImages = await getHeroImages(storeType);

  if (heroImages.length > 0) {
    return <HeroCarousel images={heroImages} />;
  }

  return (
    <HeroFallback
      storeType={storeType}
      fallbackImage={PEXELS(storeType === "women" ? 2235071 : 3748221, 1920, 1080)}
    />
  );
}

export async function StoreBelowHero({
  params,
}: {
  params: Promise<{ locale: string; storeType: string }>;
}) {
  const { storeType, locale } = await readStore(params);

  const [productListWithImages, lookbookItems, lookbookSectionVisible, homeCategories, storeSlugs] =
    await Promise.all([
      getHomeDiscoverProductsWithFirstImage(storeType, locale),
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
      saveAmountUsd: getProductDiscountSaveAmountNumber(p),
      storeType: p.storeType,
      images: imageUrls,
    };
  });

  return (
    <>
      <CategoryGrid categories={homeCategories} storeSlugs={storeSlugs} storeType={storeType} />
      {lookbookSectionVisible && <LookbookSection items={lookbookItems} />}
      <ProductDiscovery
        products={discoverProducts}
        currentStoreType={storeType}
        fallbackImage={PEXELS(708440, 440, 660)}
      />
    </>
  );
}
