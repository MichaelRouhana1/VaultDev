"use client";

import { ShimmerBlock, ListingWithFiltersSkeleton } from "@/components/storefront/SearchSkeleton";

/**
 * Shop / category / view-all loading shell: category title placeholder, utility bar strip,
 * then the same filter-aside + 4-col grid skeleton as search-with-query.
 */
export default function ShopListingSkeleton() {
  return (
    <div id="main-content" className="w-full min-h-screen bg-background">
      <header className="px-3 py-3 text-center sm:px-4 sm:py-4 md:px-5">
        <ShimmerBlock className="mx-auto h-10 w-48 sm:w-56 md:w-64" />
      </header>

      <div className="sticky top-14 z-30 bg-background">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3">
          <ShimmerBlock className="h-4 w-24" />
          <div className="flex shrink-0 items-center gap-2">
            <ShimmerBlock className="h-4 w-10" />
            <ShimmerBlock className="h-10 min-w-10 w-10" />
            <ShimmerBlock className="h-10 min-w-10 w-10" />
          </div>
        </div>
      </div>

      <ListingWithFiltersSkeleton />
    </div>
  );
}
