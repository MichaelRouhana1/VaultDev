"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { shopsForPageView } from "@/lib/analytics/meta-pageview";
import { trackMetaEvent } from "@/lib/analytics/meta-pixel-client";
import { isMetaShop, metaShopsInOrder } from "@/lib/analytics/meta-pixels";

/**
 * Fires `fbq('trackSingle', pixelId, 'PageView')` for the shop that owns this URL.
 * Bag and checkout notify only the shops with items in the bag.
 * Staff routes are skipped so admin browsing is not counted as shopper traffic.
 */
export function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { items, cartHydrated } = useCart();
  const search = searchParams.toString();
  const shops = shopsForPageView({
    pathname,
    cartHydrated,
    cartShops: metaShopsInOrder(
      items.flatMap((item) => (isMetaShop(item.storeTypeForUrl) ? [item.storeTypeForUrl] : [])),
    ),
  });
  const shopKey = shops == null ? "wait" : shops.join(",");

  useEffect(() => {
    if (pathname.includes("/admin") || shopKey === "wait" || shopKey === "") return;

    const cancels = shopKey
      .split(",")
      .filter(isMetaShop)
      .map((shop) => trackMetaEvent(shop, "PageView"));
    return () => {
      for (const cancel of cancels) cancel();
    };
  }, [pathname, search, shopKey]);

  return null;
}
