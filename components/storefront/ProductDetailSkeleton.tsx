"use client";

import { useLayoutEffect } from "react";
import { ShimmerBlock } from "@/components/storefront/SearchSkeleton";

/** Both PDP layouts share this shell while the server chooses a layout. */
export default function ProductDetailSkeleton() {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-[calc(100svh-3.5rem)] bg-background px-6 py-12" aria-busy="true">
      <ShimmerBlock className="mx-auto h-2 w-24 rounded-full" />
    </div>
  );
}
