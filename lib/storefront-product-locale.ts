import type { MosaikLocale } from "@/lib/i18n-locales";
import { isMosaikLocale } from "@/lib/i18n-locales";

type LocalizedNameFields = {
  name: string;
  nameEn: string | null;
  nameFr: string | null;
  nameAr: string | null;
};

type LocalizedDescriptionFields = {
  description: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
};

type LocalizedProductFields = LocalizedNameFields & LocalizedDescriptionFields;

const LOCALIZED_PRODUCT_COLUMN_KEYS = [
  "nameEn",
  "nameFr",
  "nameAr",
  "descriptionEn",
  "descriptionFr",
  "descriptionAr",
] as const;

type LocalizedColumnKey = (typeof LOCALIZED_PRODUCT_COLUMN_KEYS)[number];

export function storefrontLocaleFromParam(locale: string): MosaikLocale {
  return isMosaikLocale(locale) ? locale : "en";
}

export function localizedProductName(locale: MosaikLocale, row: LocalizedNameFields): string {
  const en = row.nameEn?.trim();
  const fr = row.nameFr?.trim();
  const ar = row.nameAr?.trim();
  if (locale === "ar") return ar || en || row.name;
  if (locale === "fr") return fr || en || row.name;
  return en || row.name;
}

export function localizedProductDescription(
  locale: MosaikLocale,
  row: LocalizedDescriptionFields,
): string | null {
  const en = row.descriptionEn ?? row.description;
  const fr = row.descriptionFr ?? row.descriptionEn ?? row.description;
  const ar = row.descriptionAr ?? row.descriptionEn ?? row.description;
  let raw: string | null;
  if (locale === "ar") raw = ar;
  else if (locale === "fr") raw = fr;
  else raw = en;
  if (raw == null) return null;
  return String(raw);
}

/** Strip persisted locale columns and expose resolved `name` / `description` for the storefront. */
export function withLocalizedProductCopy<T extends LocalizedProductFields & Record<string, unknown>>(
  row: T,
  locale: MosaikLocale,
): Omit<T, LocalizedColumnKey> & { name: string; description: string | null } {
  const name = localizedProductName(locale, row);
  const description = localizedProductDescription(locale, row);
  const out = { ...row } as Record<string, unknown>;
  for (const k of LOCALIZED_PRODUCT_COLUMN_KEYS) {
    delete out[k];
  }
  return { ...(out as Omit<T, LocalizedColumnKey>), name, description };
}
