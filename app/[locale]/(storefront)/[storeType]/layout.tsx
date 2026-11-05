import { MetaShopNoscript } from "@/components/analytics/MetaPixel";
import { metaPixelIdForShop } from "@/lib/analytics/meta-pixels";
import { isListingStore } from "@/lib/store-scope";

export default async function StoreTypeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeType: string }>;
}) {
  const { storeType } = await params;
  const pixelId = isListingStore(storeType) ? metaPixelIdForShop(storeType) : null;

  return (
    <>
      {children}
      {pixelId ? <MetaShopNoscript pixelId={pixelId} /> : null}
    </>
  );
}
