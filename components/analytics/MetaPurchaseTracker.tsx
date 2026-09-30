"use client";

import { useEffect, useRef } from "react";
import {
  META_PIXEL_CURRENCY,
  metaPurchaseEventId,
  type MetaContent,
} from "@/lib/analytics/meta-commerce";
import { trackMetaEvent } from "@/lib/analytics/meta-pixel-client";

type MetaPurchaseTrackerProps = {
  orderId: number;
  value: number;
  contentIds: string[];
  contents: MetaContent[];
  numItems: number;
};

/**
 * Fires one browser Purchase for an order the success page is already allowed to show.
 * `eventID` matches the Conversions API event so a refresh is not a second sale.
 */
export function MetaPurchaseTracker({
  orderId,
  value,
  contentIds,
  contents,
  numItems,
}: MetaPurchaseTrackerProps) {
  const sentFor = useRef<number | null>(null);

  useEffect(() => {
    if (sentFor.current === orderId) return;
    sentFor.current = orderId;
    trackMetaEvent(
      "Purchase",
      {
        value,
        currency: META_PIXEL_CURRENCY,
        content_ids: contentIds,
        content_type: "product",
        contents,
        num_items: numItems,
      },
      metaPurchaseEventId(orderId),
    );
  }, [orderId, value, contentIds, contents, numItems]);

  return null;
}
