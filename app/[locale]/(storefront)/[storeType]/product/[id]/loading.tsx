import { Suspense } from "react";
import { getProductPageLayout } from "@/actions/product-page-layout";
import ProductDetailSkeleton from "@/components/storefront/ProductDetailSkeleton";

async function ProductLayoutSkeleton() {
  const layout = await getProductPageLayout();
  return <ProductDetailSkeleton layout={layout} />;
}

export default function ProductLoading() {
  return (
    <div className="md:pt-14">
      <Suspense fallback={<ProductDetailSkeleton layout="new" />}>
        <ProductLayoutSkeleton />
      </Suspense>
    </div>
  );
}
