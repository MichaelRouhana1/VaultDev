import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { wishlists } from "@/db/schema";
import { SearchClient } from "@/components/storefront/SearchClient";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale: localeParam } = await params;
  const locale = storefrontLocaleFromParam(localeParam);
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q.trim() : "";

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
      <SearchClient locale={locale} initialQuery={initialQuery} wishlistProductIds={wishlistProductIds} />
    </div>
  );
}
