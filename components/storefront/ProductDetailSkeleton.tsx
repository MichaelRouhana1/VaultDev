"use client";

import { useLayoutEffect } from "react";
import { ShimmerBlock } from "@/components/storefront/SearchSkeleton";

function scrollProductDetailShellToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function AccordionStubs() {
  return (
    <div className="mt-10 w-full border-t border-border" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
          <ShimmerBlock className="h-3 w-28 sm:w-36" />
          <ShimmerBlock className="h-8 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function SimilarItemTiles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-w-0" aria-hidden>
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
 * Product details route shell (loading.tsx): mirrors ProductDetailClient — mobile full-screen overlay
 * and desktop 2-column gallery + buy box. ShimmerBlock already handles light/dark.
 */
export default function ProductDetailSkeleton() {
  /** Before paint: avoid one frame of skeleton while the window is still at the previous page’s scroll offset. */
  useLayoutEffect(() => {
    scrollProductDetailShellToTop();
  }, []);

  return (
    <div id="main-content" className="w-full min-h-screen bg-background" aria-busy="true">
      {/* Mobile: full-screen PDP above global nav */}
      <div className="fixed inset-0 z-[55] flex flex-col overflow-y-auto overscroll-y-contain bg-background md:hidden">
        <ShimmerBlock className="aspect-[2/3] w-full shrink-0" />
        <div className="flex flex-1 flex-col px-4 pb-10 pt-5">
          <ShimmerBlock className="h-5 w-[72%]" />
          <ShimmerBlock className="mt-5 h-5 w-24" />
          <div className="mt-6" aria-hidden>
            <ShimmerBlock className="mb-2 h-3 w-10" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <ShimmerBlock key={i} className="h-8 w-8" />
              ))}
            </div>
          </div>
          <ShimmerBlock className="mt-8 h-14 w-full" />
          <AccordionStubs />
        </div>
      </div>

      {/* Desktop breadcrumb + 2-col PDP */}
      <div className="hidden md:block">
        <div className="mb-6 flex items-center gap-2 px-6 pt-4 md:pt-5" aria-hidden>
          <ShimmerBlock className="h-4 w-12" />
          <ShimmerBlock className="h-4 w-2" />
          <ShimmerBlock className="h-4 w-20" />
          <ShimmerBlock className="h-4 w-2" />
          <ShimmerBlock className="h-4 w-24" />
        </div>

        <div className="relative mx-auto w-full md:max-w-[min(100%,1680px)] md:px-5 md:py-12 lg:px-6 xl:px-8">
          <div className="md:grid md:grid-cols-1 md:gap-12 lg:grid-cols-2 lg:items-start lg:gap-20 xl:gap-28">
            <div className="flex flex-col gap-4 lg:min-w-0 lg:pe-3 xl:pe-6 2xl:pe-8" aria-hidden>
              <ShimmerBlock className="aspect-[2/3] w-full" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <ShimmerBlock className="aspect-[2/3] w-full" />
                <ShimmerBlock className="aspect-[2/3] w-full" />
              </div>
            </div>

            <div className="hidden flex-col md:flex lg:min-w-0 lg:ps-2 xl:ps-6 2xl:ps-8">
              <div className="flex items-start justify-between gap-4" aria-hidden>
                <ShimmerBlock className="h-6 w-[70%]" />
                <ShimmerBlock className="h-5 w-5 shrink-0" />
              </div>
              <div className="mt-4" aria-hidden>
                <ShimmerBlock className="mb-3 h-3 w-28" />
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ShimmerBlock key={i} className="h-11 w-11" />
                  ))}
                </div>
              </div>
              <ShimmerBlock className="mt-6 h-5 w-24" />
              <div className="mt-8" aria-hidden>
                <ShimmerBlock className="mb-3 h-3 w-10" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <ShimmerBlock key={i} className="h-12 w-12" />
                  ))}
                </div>
              </div>
              <ShimmerBlock className="mt-10 h-[3.75rem] w-full" />
              <AccordionStubs />
            </div>
          </div>

          <section className="mt-24 hidden border-t border-border pt-16 md:block">
            <ShimmerBlock className="mb-8 h-3.5 w-36" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <SimilarItemTiles count={5} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
