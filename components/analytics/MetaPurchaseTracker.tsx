"use client";

import { useEffect, useRef } from "react";
import {
  META_PIXEL_CURRENCY,
  metaPurchaseEventId,
  type MetaContent,
} from "@/lib/analytics/meta-commerce";
import { trackMetaEvent } from "@/lib/analytics/meta-pixel-client";
import type { MetaShop } from "@/lib/analytics/meta-pixels";

type MetaPurchaseTrackerProps = {
  shop: MetaShop;
  orderId: number;
  value: number;
  contentIds: string[];
  contents: MetaContent[];
  numItems: number;
};

/**
 * Fires one browser Purchase for this shop's share of an order the success page
 * is already allowed to show. `eventID` matches that shop's Conversions API event
 * so a refresh is not a second sale.
 */
export function MetaPurchaseTracker({
  shop,
  orderId,
  value,
  contentIds,
  contents,
  numItems,
}: MetaPurchaseTrackerProps) {
  const sentFor = useRef<string | null>(null);
  const eventId = metaPurchaseEventId(orderId, shop);

  useEffect(() => {
    if (sentFor.current === eventId) return;
    sentFor.current = eventId;
    trackMetaEvent(
      shop,
      "Purchase",
      {
        value,
        currency: META_PIXEL_CURRENCY,
        content_ids: contentIds,
        content_type: "product",
        contents,
        num_items: numItems,
        order_id: String(orderId),
      },
      eventId,
    );
  }, [shop, orderId, value, contentIds, contents, numItems, eventId]);

  return null;
}
