import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, productColors } from "@/db/schema";
import { getHeroImages } from "@/actions/hero";
import { getLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { getCategoriesForHome, getStoreCategorySlugs } from "@/actions/categories";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import { notFound } from "next/navigation";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HeroFallback } from "@/components/storefront/HeroFallback";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { EditorialPromotion } from "@/components/storefront/EditorialPromotion";
import { LookbookSection } from "@/components/storefront/LookbookSection";
import { ProductDiscovery } from "@/components/storefront/ProductDiscovery";
import { SiteFooter } from "@/components/storefront/SiteFooter";
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

export default async function HomePage({ params }: { params: Promise<{ storeType: string }> }) {
  const { storeType } = await params;
  if (storeType !== "streetwear" && storeType !== "formal") return notFound();

  const firstColorSubq = db
    .select({
      firstImageUrl: sql<string>`(image_urls)[1]::text`.as("first_image_url"),
    })
    .from(productColors)
    .where(eq(productColors.productId, products.id))
    .orderBy(productColors.id)
    .limit(1)
    .as("first_color");

  const [productListWithImages, heroImages, lookbookItems, lookbookSectionVisible, homeCategories, storeSlugs] =
    await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          salePrice: products.salePrice,
          saleStartsAt: products.saleStartsAt,
          saleEndsAt: products.saleEndsAt,
          isSaleActive: products.isSaleActive,
          category: products.category,
          categorySlug: products.categorySlug,
          color: products.color,
          isVisible: products.isVisible,
          storeType: products.storeType,
          firstImageUrl: firstColorSubq.firstImageUrl,
        })
        .from(products)
        .leftJoinLateral(firstColorSubq, sql`true`)
        .where(and(eq(products.isVisible, true), eq(products.storeType, storeType as "streetwear" | "formal")))
        .orderBy(desc(products.id))
        .limit(8),
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
    <div className="pt-14">
      {/* Hero */}
      {heroImages.length > 0 ? (
        <HeroCarousel images={heroImages} />
      ) : (
        <HeroFallback storeType={storeType} fallbackImage={PEXELS(3748221, 1920, 1080)} />
      )}

      {/* Category Grid */}
      <CategoryGrid categories={homeCategories} storeSlugs={storeSlugs} storeType={storeType} />

      {/* Editorial Promotion */}
      <EditorialPromotion />

      {/* Lookbook */}
      {lookbookSectionVisible && <LookbookSection items={lookbookItems} />}

      {/* Product Discovery */}
      <ProductDiscovery products={discoverProducts} currentStoreType={storeType} fallbackImage={PEXELS(708440, 440, 660)} />

      {/* Newsletter */}
      <NewsletterForm />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
