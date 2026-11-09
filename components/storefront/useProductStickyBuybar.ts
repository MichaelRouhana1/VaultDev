"use client";

import { useLayoutEffect, type RefObject } from "react";
import { PRODUCT_STICKY_BUYBAR_CSS_VAR } from "@/lib/product-sticky-buybar";

/** Only the buy bar for the current viewport controls the footer's bottom offset. */
export function useProductStickyBuybar(
  ref: RefObject<HTMLDivElement | null>,
  visible: boolean,
  mediaQuery?: string,
) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = mediaQuery ? window.matchMedia(mediaQuery) : null;
    const element = ref.current;
    const apply = () => {
      if (media && !media.matches) return;
      if (visible && element) {
        root.style.setProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR, `${element.offsetHeight}px`);
      } else {
        root.style.removeProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR);
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    if (element) observer.observe(element);
    media?.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      media?.removeEventListener("change", apply);
      if (!media || media.matches) root.style.removeProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR);
    };
  }, [ref, visible, mediaQuery]);
}
