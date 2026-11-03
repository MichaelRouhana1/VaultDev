import { ShimmerBlock } from "@/components/storefront/SearchSkeleton";

export function StoreHeroSkeleton() {
  return <ShimmerBlock className="min-h-[82vh] w-full rounded-none sm:min-h-[86vh] md:h-[86vh]" />;
}

export function StoreBelowHeroSkeleton() {
  return (
    <div aria-hidden>
      <div className="px-4 pt-16 pb-8 md:px-6 md:pt-24 md:pb-12">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-2 md:gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <ShimmerBlock key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>
      <div className="px-6 pt-10 pb-24 md:pt-14">
        <ShimmerBlock className="mx-auto mb-12 h-3.5 w-28" />
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ShimmerBlock key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Same tree as the store-home `loading.tsx` shell and the page Suspense fallbacks. */
export function StoreHomeSkeleton() {
  return (
    <div className="lg:pt-14">
      <StoreHeroSkeleton />
      <div
        id="store-landing-categories-sentinel"
        className="pointer-events-none h-0 w-full shrink-0"
        aria-hidden
      />
      <StoreBelowHeroSkeleton />
    </div>
  );
}
