export const PRODUCT_IMAGE_ORIGIN = "https://cdn.vault-lb.com";
export const IMAGE_TRANSFORM_BASE = "https://vault-lb.com/cdn-cgi/image/";

// Older catalog rows still refer to the public URL of the same R2 bucket.
const LEGACY_PRODUCT_IMAGE_ORIGIN = "https://pub-dd439ea48c874db4908b36da9aca6da6.r2.dev";

const STOREFRONT_IMAGE_PATH = /^\/(?:product-images|hero-images|category-images|lookbook|landing-images)\//;

export type ImageWidths = readonly [number, ...number[]];

export function storefrontImageCandidates(src: string, widths: ImageWidths, quality?: number): { src: string; srcSet?: string } {
  let source = src;
  try {
    const url = new URL(src);
    if (url.origin === LEGACY_PRODUCT_IMAGE_ORIGIN && !url.username && !url.password && STOREFRONT_IMAGE_PATH.test(url.pathname)) {
      source = PRODUCT_IMAGE_ORIGIN + url.pathname + url.search;
    }
  } catch {
    return { src };
  }
  const first = cfImage(source, { width: widths[0], quality });
  if (first === source) return { src };
  return {
    src: first,
    srcSet: widths.map((width) => `${cfImage(source, { width, quality })} ${width}w`).join(", "),
  };
}

export function productImageSource(src: string): string {
  try {
    const url = new URL(src);
    if (url.origin === LEGACY_PRODUCT_IMAGE_ORIGIN && !url.username && !url.password && url.pathname.startsWith("/product-images/")) {
      return PRODUCT_IMAGE_ORIGIN + url.pathname + url.search;
    }
  } catch {
    // Relative and other non-URL sources are already usable as-is.
  }
  return src;
}

export function cfImage(
  src: string,
  { width, quality = 75, fallback = true }: { width: number; quality?: number; fallback?: boolean },
): string {
  try {
    const url = new URL(src);
    if (url.origin !== PRODUCT_IMAGE_ORIGIN || url.username || url.password || !Number.isFinite(width) || width < 1) {
      return src;
    }
    const targetWidth = Math.min(4000, Math.round(width));
    const targetQuality = Number.isFinite(quality) ? Math.max(1, Math.min(100, Math.round(quality))) : 75;
    url.hash = "";
    const onError = fallback ? ",onerror=redirect" : "";
    return `${IMAGE_TRANSFORM_BASE}width=${targetWidth},quality=${targetQuality},format=auto,fit=scale-down${onError}/${url.href}`;
  } catch {
    return src;
  }
}
