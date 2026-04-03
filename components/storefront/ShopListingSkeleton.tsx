"use client";

import { ShimmerBlock, ListingGridSkeleton, ListingUtilityBarSkeleton } from "@/components/storefront/SearchSkeleton";

/**
 * Shop / category / view-all loading shell: category title placeholder, utility bar (FILTERS + view),
 * then full-width 4-column grid (filter drawer/sidebar closed by default).
 */
export default function ShopListingSkeleton() {
  return (
    <div id="main-content" className="w-full min-h-screen bg-background">
      <header className="px-3 py-3 text-center sm:px-4 sm:py-4 md:px-5">
        <ShimmerBlock className="mx-auto h-10 w-48 sm:w-56 md:w-64" />
      </header>

      <ListingUtilityBarSkeleton variant="shop" />

      <ListingGridSkeleton />
    </div>
  );
}
