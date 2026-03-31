export const MOSAIK_LOCALES = ["en", "fr", "ar"] as const;
export type MosaikLocale = (typeof MOSAIK_LOCALES)[number];

export function isMosaikLocale(value: string | undefined): value is MosaikLocale {
  return value !== undefined && (MOSAIK_LOCALES as readonly string[]).includes(value);
}

/** First path segment when it is a supported locale; otherwise default `en`. */
export function localeSegmentFromPathname(pathname: string): MosaikLocale {
  const seg = pathname.split("/").filter(Boolean)[0];
  return isMosaikLocale(seg) ? seg : "en";
}
