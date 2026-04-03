"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Reusable component for the Bershka left-to-right sweeping effect
function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-gray-200 dark:bg-gray-800", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
}

function SearchLoadingLayout({ query }: { query: string }) {
  const t = useTranslations("Search");

  return (
    <div className="pt-14">
      <main className="w-full min-h-screen bg-background">
        {/* Instantly loaded Search Bar Header */}
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
              {/* Active search spinner */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground/50"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton Filter & Product Grid Layout */}
        <div className="relative flex w-full items-start gap-x-4 px-4 pt-2 pb-5 sm:px-5 sm:pt-3 sm:pb-6 md:gap-x-6 md:px-6 md:pt-4 md:pb-8">
          {/* Desktop Filter Sidebar Skeleton */}
          <aside className="hidden w-[250px] shrink-0 space-y-8 pt-5 md:block lg:w-[280px]">
            <div>
              <ShimmerBlock className="mb-4 h-4 w-24 rounded" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <ShimmerBlock key={i} className="h-3 w-full rounded" />
                ))}
              </div>
            </div>
            <div>
              <ShimmerBlock className="mb-4 h-4 w-20 rounded" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <ShimmerBlock key={i} className="h-3 w-5/6 rounded" />
                ))}
              </div>
            </div>
          </aside>

          {/* Product Cards Skeleton Grid */}
          <div className="mt-4 min-w-0 flex-1 md:mt-0">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  {/* Image Placeholder */}
                  <ShimmerBlock className="aspect-[3/4] w-full rounded-sm" />

                  {/* Text Placeholders */}
                  <div className="space-y-2">
                    <ShimmerBlock className="h-3 w-3/4 rounded" />
                    <ShimmerBlock className="h-3 w-1/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SearchLoadingFromParams() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  return <SearchLoadingLayout query={query} />;
}

export default function SearchLoading() {
  return (
    <Suspense fallback={<SearchLoadingLayout query="" />}>
      <SearchLoadingFromParams />
    </Suspense>
  );
}
