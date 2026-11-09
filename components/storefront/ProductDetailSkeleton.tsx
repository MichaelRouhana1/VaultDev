"use client";

import { useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import { ShimmerBlock } from "@/components/storefront/SearchSkeleton";
import type { ProductPageLayout } from "@/actions/product-page-layout";
import { cn } from "@/lib/utils";
import styles from "@/components/storefront/product-detail.module.css";

const photoControlSkeleton = "size-10 rounded-full bg-background/70 dark:bg-background/70";

function PurchasePanelSkeleton({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className={cn(desktop && cn(styles.purchase, "relative shrink-0 bg-background/85 backdrop-blur-xl"))}>
      <div className="px-5 pb-5 pt-5 md:p-6">
        {desktop && (
          <div className="mb-3 flex h-8 items-center justify-end">
            <ShimmerBlock className="size-4" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <ShimmerBlock className="h-5 w-3/5" />
          <ShimmerBlock className="h-5 w-14 shrink-0" />
        </div>
        <div className="mt-5">
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <ShimmerBlock key={index} className="size-8" />
            ))}
          </div>
          <ShimmerBlock className="mt-2 h-4 w-20" />
        </div>
      </div>

      <div className="border-t border-foreground/10 px-5 pb-5 pt-5 md:p-6">
        <ShimmerBlock className="h-4 w-10" />
        <div className="-ms-1.5 mt-1.5 flex gap-x-1">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid h-10 min-w-9 place-items-center px-1.5 md:min-w-10">
              <ShimmerBlock className="h-3 w-5" />
            </div>
          ))}
        </div>
        <ShimmerBlock className="mt-4 h-10 w-full" />
        <div className="mt-3 flex flex-col gap-1">
          {["w-32", "w-28"].map((width) => (
            <div key={width} className="flex items-center gap-2 py-0.5">
              <ShimmerBlock className="size-3.5" />
              <ShimmerBlock className={cn("h-3", width)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobilePurchasePanelSkeleton() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <ShimmerBlock className="h-7 w-4/5" />
        <ShimmerBlock className="size-7 shrink-0" />
      </div>
      <ShimmerBlock className="mt-5 h-7 w-20" />
      <div className="mt-6">
        <ShimmerBlock className="mb-2 h-4 w-10" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <ShimmerBlock key={index} className="h-8 w-8 rounded-sm" />
          ))}
        </div>
      </div>
      <ShimmerBlock className="mt-8 h-13 w-full" />
      <ShimmerBlock className="mt-2 h-4 w-36" />
    </div>
  );
}

function DetailRowsSkeleton({ old = false }: { old?: boolean }) {
  return (
    <div className={cn("w-full", old && "mt-10 border-t border-border")}>
      {["w-28", "w-36", "w-24"].map((width) => (
        <div key={width} className={cn("flex min-h-14 items-center justify-between gap-4 border-b border-border py-3", old && "min-h-16 py-4 last:border-b-0")}>
          <ShimmerBlock className={cn("h-3", width)} />
          <ShimmerBlock className={cn("size-5 shrink-0", old && "size-8")} />
        </div>
      ))}
    </div>
  );
}

function SimilarItemsSkeleton() {
  return (
    <>
      <ShimmerBlock className="mb-8 h-5 w-40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={cn("min-w-0", index === 4 && "hidden lg:block")}>
            <ShimmerBlock className="aspect-[3/4] w-full" />
            <ShimmerBlock className="mt-3 h-3 w-4/5" />
            <ShimmerBlock className="mt-2 h-3 w-14" />
          </div>
        ))}
      </div>
    </>
  );
}

function OldDesktopSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-center gap-2 px-6 pt-5">
        <ShimmerBlock className="h-5 w-12" />
        <ShimmerBlock className="h-5 w-20" />
        <ShimmerBlock className="h-5 w-24" />
      </div>
      <div className="mx-auto w-full max-w-[min(100%,1680px)] px-5 py-12 lg:px-6 xl:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start lg:gap-20 xl:gap-28">
          <div className="min-w-0 lg:pe-3 xl:pe-6 2xl:pe-8">
            <ShimmerBlock className="aspect-[2/3] w-full" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <ShimmerBlock className="aspect-[2/3] w-full" />
              <ShimmerBlock className="aspect-[2/3] w-full" />
            </div>
          </div>
          <div className="min-w-0 lg:ps-2 xl:ps-6 2xl:ps-8">
            <div className="flex items-start justify-between gap-4">
              <ShimmerBlock className="h-7 w-4/5" />
              <ShimmerBlock className="size-5 shrink-0" />
            </div>
            <ShimmerBlock className="mt-4 h-4 w-28" />
            <div className="mt-3 flex gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <ShimmerBlock key={index} className="size-12" />
              ))}
            </div>
            <ShimmerBlock className="mt-6 h-7 w-20" />
            <div className="mt-8">
              <ShimmerBlock className="mb-3 h-4 w-10" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <ShimmerBlock key={index} className="size-12" />
                ))}
              </div>
            </div>
            <ShimmerBlock className="mt-10 h-15 w-full" />
            <ShimmerBlock className="mt-2 h-4 w-36" />
            <DetailRowsSkeleton old />
          </div>
        </div>
        <div className="mt-24 border-t border-border pt-16">
          <SimilarItemsSkeleton />
        </div>
      </div>
    </>
  );
}

/** Both desktop layouts have full placeholders and share the same mobile skeleton. */
export default function ProductDetailSkeleton({ layout = "new" }: { layout?: ProductPageLayout }) {
  const t = useTranslations("Common");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const mobile = window.matchMedia("(max-width: 767px)");
    const previousOverflow = document.body.style.overflow;
    const syncOverflow = () => {
      document.body.style.overflow = mobile.matches ? "hidden" : previousOverflow;
    };
    syncOverflow();
    mobile.addEventListener("change", syncOverflow);
    return () => {
      mobile.removeEventListener("change", syncOverflow);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <main className={cn(styles.layout, "relative w-full bg-background md:pb-12")} aria-busy="true">
      <span role="status" className="sr-only">{t("loading")}</span>

      <div aria-hidden className="fixed inset-0 z-[55] flex flex-col overflow-y-auto overscroll-y-contain bg-background md:hidden">
        <div className="relative w-full shrink-0 overflow-hidden">
          <ShimmerBlock className="aspect-[2/3] w-full" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
            <ShimmerBlock className={photoControlSkeleton} />
            <div className="flex gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <ShimmerBlock key={index} className={photoControlSkeleton} />
              ))}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-14">
            <div className="size-10 shrink-0" />
            <div className="flex flex-1 justify-center gap-1.5">
              {Array.from({ length: 3 }, (_, index) => (
                <ShimmerBlock key={index} className="size-1.5 rounded-full bg-background/70 dark:bg-background/70" />
              ))}
            </div>
            <ShimmerBlock className={cn(photoControlSkeleton, "shrink-0")} />
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-10 pt-5">
          <MobilePurchasePanelSkeleton />
          <DetailRowsSkeleton old />
          <div className="mt-12 border-t border-border pt-12">
            <SimilarItemsSkeleton />
          </div>
        </div>
      </div>

      <div aria-hidden className="hidden md:block">
        {layout === "old" ? <OldDesktopSkeleton /> : (
          <>
            <div className={cn(styles.hero, "relative isolate flex items-end justify-end overflow-hidden bg-muted")}>
              <div className="absolute inset-0 flex">
                {Array.from({ length: 5 }, (_, index) => (
                  <ShimmerBlock key={index} className={cn("h-full basis-[var(--pdp-photo-width)] shrink-0", index % 2 === 1 && "bg-muted")} />
                ))}
              </div>
              <PurchasePanelSkeleton desktop />
            </div>
            <div className={cn(styles.details, "grid items-center")}>
              <ShimmerBlock className="aspect-[.78] w-full" />
              <div className="px-[clamp(1.5rem,10.5vw,14rem)] py-12">
                <DetailRowsSkeleton />
              </div>
            </div>
            <div className="mx-auto mt-16 max-w-[1680px] border-t border-border px-5 pt-16 lg:px-8">
              <SimilarItemsSkeleton />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
