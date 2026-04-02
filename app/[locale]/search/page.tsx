import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { wishlists, type ProductColor, type ProductVariant } from "@/db/schema";
import { SearchClient } from "@/components/storefront/SearchClient";
import {
  buildSearchPageFilterContext,
  getRecommendedProducts,
  getSearchResults,
  hydrateSearchProductCardRows,
  loadSearchFilterWave1,
  type SearchListingProduct,
  type SearchPageFilterContext,
} from "@/actions/search-page-data";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: localeParam } = await params;
  const locale = storefrontLocaleFromParam(localeParam);
  const { q } = await searchParams;
  const searchQuery = typeof q === "string" ? q.trim() : "";

  let recommendedProducts: SearchListingProduct[] = [];
  let recommendedVariantsByProductId: Record<number, import("@/db/schema").ProductVariant[]> = {};
  let recommendedColorsByProductId: Record<number, import("@/db/schema").ProductColor[]> = {};

  let initialProducts: SearchListingProduct[] = [];
  let totalCount = 0;
  let initialVariantsByProductId: Record<number, ProductVariant[]> = {};
  let initialColorsByProductId: Record<number, ProductColor[]> = {};
  let searchFilters: SearchPageFilterContext | null = null;

  if (!searchQuery) {
    const cards = await getRecommendedProducts(40, locale);
    const rec = await hydrateSearchProductCardRows(cards);
    recommendedProducts = rec.products;
    recommendedVariantsByProductId = rec.variantsByProductId;
    recommendedColorsByProductId = rec.colorsByProductId;
  } else {
    const [searchPage, wave1] = await Promise.all([
      getSearchResults(searchQuery, 0, 40, locale),
      loadSearchFilterWave1(searchQuery),
    ]);
    const loadedIds = searchPage.products.map((c) => c.id);
    const [hydrated, filterCtx] = await Promise.all([
      hydrateSearchProductCardRows(searchPage.products),
      buildSearchPageFilterContext(searchQuery, loadedIds, wave1),
    ]);
    initialProducts = hydrated.products;
    totalCount = searchPage.totalCount;
    initialVariantsByProductId = hydrated.variantsByProductId;
    initialColorsByProductId = hydrated.colorsByProductId;
    searchFilters = filterCtx;
  }

  let wishlistProductIds: number[] = [];
  const { userId } = await auth();
  if (userId) {
    const userWishlist = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    wishlistProductIds = userWishlist.map((w) => w.productId);
  }

  return (
    <div className="pt-14">
      <SearchClient
        key={searchQuery ? `q:${searchQuery}` : "browse"}
        locale={locale}
        wishlistProductIds={wishlistProductIds}
        searchQuery={searchQuery}
        totalCount={totalCount}
        initialProducts={initialProducts}
        recommendedProducts={recommendedProducts}
        initialVariantsByProductId={initialVariantsByProductId}
        initialColorsByProductId={initialColorsByProductId}
        recommendedVariantsByProductId={recommendedVariantsByProductId}
        recommendedColorsByProductId={recommendedColorsByProductId}
        searchFilters={searchFilters}
      />
    </div>
  );
}
