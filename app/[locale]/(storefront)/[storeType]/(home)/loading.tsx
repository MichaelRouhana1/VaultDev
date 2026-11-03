import { StoreHomeSkeleton } from "@/components/storefront/StoreHomeSkeleton";

/** Instant store-home shell. Nested under `(home)` so `/shop` keeps its own listing skeleton. */
export default function StoreHomeLoading() {
  return <StoreHomeSkeleton />;
}
