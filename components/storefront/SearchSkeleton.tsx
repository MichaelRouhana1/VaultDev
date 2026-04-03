"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Bershka-style left-to-right shimmer (see `animate-shimmer` in `globals.css`). */
export function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-none bg-gray-200 dark:bg-gray-800", className)}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
}

function ProductSkeletonTiles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-w-0">
          <div className="flex w-full flex-col items-start gap-3">
            <ShimmerBlock className="aspect-[3/4] w-full self-stretch" />
            <div className="flex w-full flex-col items-start gap-2">
              <ShimmerBlock className="h-3 w-[92%]" />
              <ShimmerBlock className="h-3 w-[48%]" />
              <ShimmerBlock className="h-3 w-[28%]" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Sticky strip matching `UtilityBar`: “FILTERS” on the left; search shows a result-count line,
 * shop shows VIEW + density toggles. Filter panel is closed by default — no sidebar skeleton.
 */
export function ListingUtilityBarSkeleton({ variant }: { variant: "search" | "shop" }) {
  return (
    <div className="sticky top-14 z-30 bg-background">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3">
        <ShimmerBlock className="h-3.5 w-[4.25rem] sm:w-20" aria-hidden />
        {variant === "search" ? (
          <ShimmerBlock className="h-3 w-32 shrink-0 sm:w-36" aria-hidden />
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <ShimmerBlock className="h-3.5 w-10 sm:w-11" aria-hidden />
            <ShimmerBlock className="h-10 min-w-10 w-10" aria-hidden />
            <ShimmerBlock className="h-10 min-w-10 w-10" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-width product grid (4 columns from `md`); matches listing with filters closed. */
export function ListingGridSkeleton({
  gridClassName = "grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:gap-8",
  tileCount = 8,
}: {
  gridClassName?: string;
  tileCount?: number;
}) {
  return (
    <div className="relative w-full px-4 pt-2 pb-5 sm:px-5 sm:pt-3 sm:pb-6 md:px-6 md:pt-4 md:pb-8">
      <div className={gridClassName}>
        <ProductSkeletonTiles count={tileCount} />
      </div>
    </div>
  );
}

/** @deprecated Use ListingGridSkeleton — name kept for any external imports. */
export const ListingWithFiltersSkeleton = ListingGridSkeleton;

export default function SearchSkeleton({ query }: { query: string }) {
  const t = useTranslations("Search");
  const hasSearchQuery = query.trim().length > 0;

  return (
    <main id="main-content" className="w-full min-h-screen bg-background">
      {/* Search bar header (matches SearchClient) */}
      <div className="px-4 pt-6 pb-4 sm:px-5 md:px-6 md:pt-8">
        <h1 className="text-center text-xs font-medium uppercase tracking-[0.25em] text-foreground">
          {t("title")}
        </h1>
        <div className="mx-auto mt-6 w-full max-w-2xl">
          <div className="relative">
            <input
              type="search"
              defaultValue={query}
              readOnly
              placeholder={t("placeholder")}
              className={cn(
                "w-full border border-foreground/25 bg-background px-4 py-3.5 text-base md:py-4 md:text-lg",
                "cursor-not-allowed font-light tracking-wide text-foreground opacity-60",
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground/50"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      {hasSearchQuery ? (
        <>
          <ListingUtilityBarSkeleton variant="search" />
          <ListingGridSkeleton />
        </>
      ) : (
        <section className="px-4 pb-10 sm:px-5 md:px-6 md:pb-12">
          <h2 className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("thingsYouMightLike")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-5 md:gap-4 lg:gap-6">
            <ProductSkeletonTiles count={10} />
          </div>
        </section>
      )}
    </main>
  );
}
