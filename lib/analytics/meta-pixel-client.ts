import { META_PIXEL_CURRENCY } from "@/lib/analytics/meta-commerce";
import { hasAnyMetaPixel, metaPixelIdForShop, type MetaShop } from "@/lib/analytics/meta-pixels";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function isMetaPixelClientEnabled(): boolean {
  return hasAnyMetaPixel();
}

/**
 * Sends a standard Meta event to one shop pixel once `fbq` exists.
 * `trackSingle` keeps the event off the other shops. The bootstrap stub queues
 * calls before `fbevents.js` finishes loading. No-ops when that shop's pixel id
 * is unset. The returned cancel stops a pending wait; do not use it from a
 * Strict Mode effect cleanup or the first attempt is dropped and a ref will
 * skip the retry.
 */
export function trackMetaEvent(
  shop: MetaShop,
  eventName: string,
  params: Record<string, unknown> = {},
  eventID?: string,
): () => void {
  const pixelId = metaPixelIdForShop(shop);
  if (typeof window === "undefined" || !pixelId) {
    return () => {};
  }

  let cancelled = false;
  let attempts = 0;
  const maxAttempts = 80;

  const timer = window.setInterval(() => {
    if (cancelled) return;
    attempts++;
    const fbq = window.fbq;
    if (typeof fbq === "function") {
      window.clearInterval(timer);
      if (eventID) {
        fbq("trackSingle", pixelId, eventName, params, { eventID });
      } else {
        fbq("trackSingle", pixelId, eventName, params);
      }
    } else if (attempts >= maxAttempts) {
      window.clearInterval(timer);
    }
  }, 50);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}

export { META_PIXEL_CURRENCY };
