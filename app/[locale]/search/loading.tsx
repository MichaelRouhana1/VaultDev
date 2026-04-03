"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SearchSkeleton from "@/components/storefront/SearchSkeleton";

function SearchLoadingFromParams() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  return <SearchSkeleton query={query} />;
}

export default function SearchLoading() {
  return (
    <div className="pt-14">
      <Suspense fallback={<SearchSkeleton query="" />}>
        <SearchLoadingFromParams />
      </Suspense>
    </div>
  );
}
