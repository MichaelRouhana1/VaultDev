"use client";

import { useLayoutEffect } from "react";
import { ShimmerBlock, ListingGridSkeleton, ListingUtilityBarSkeleton } from "@/components/storefront/SearchSkeleton";

/** Document scroll for shop listing route shell (loading + client skeleton). */
export function scrollShopListingShellToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Shop / category / view-all loading shell: category title placeholder, utility bar (FILTERS + view),
 * then full-width 4-column grid (filter drawer/sidebar closed by default).
 */
export default function ShopListingSkeleton() {
  /** Before paint: avoid one frame of skeleton while the window is still at the previous page’s scroll offset. */
  useLayoutEffect(() => {
    scrollShopListingShellToTop();
  }, []);

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
