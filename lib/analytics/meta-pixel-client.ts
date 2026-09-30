import { META_PIXEL_CURRENCY } from "@/lib/analytics/meta-commerce";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function isMetaPixelClientEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());
}

/**
 * Sends a standard Meta event once `fbq` exists. The bootstrap stub queues calls
 * before `fbevents.js` finishes loading. No-ops when the pixel id is unset.
 * The returned cancel stops a pending wait; do not use it from a Strict Mode
 * effect cleanup or the first attempt is dropped and a ref will skip the retry.
 */
export function trackMetaEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  eventID?: string,
): () => void {
  if (typeof window === "undefined" || !isMetaPixelClientEnabled()) {
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
        fbq("track", eventName, params, { eventID });
      } else {
        fbq("track", eventName, params);
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
