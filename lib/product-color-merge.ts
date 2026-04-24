import { formatProductNameTitleCase } from "@/lib/format-product-label";

export type MergeableColorEntry = {
  name: string;
  hexCode: string | null;
  imageUrls: string[];
};

function appendUniqueUrls(target: string[], more: readonly string[]): void {
  for (const u of more) {
    if (!target.includes(u)) target.push(u);
  }
}

/**
 * Merges color rows that differ only by case: same canonical title-case name, combined images.
 * Used when saving product colors from admin.
 */
export function mergeColorEntriesCaseInsensitive<T extends MergeableColorEntry>(entries: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const e of entries) {
    const key = e.name.trim().toLowerCase();
    const canonicalName = formatProductNameTitleCase(e.name);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...e, name: canonicalName, imageUrls: [...e.imageUrls] });
    } else {
      appendUniqueUrls(prev.imageUrls, e.imageUrls);
      if (prev.hexCode == null && e.hexCode != null) prev.hexCode = e.hexCode;
    }
  }
  return [...byKey.values()];
}

export type MergeableColorEntryWithId = MergeableColorEntry & { existingId: number | null };

export function mergeColorEntriesCaseInsensitiveWithExistingId<T extends MergeableColorEntryWithId>(
  entries: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const e of entries) {
    const key = e.name.trim().toLowerCase();
    const canonicalName = formatProductNameTitleCase(e.name);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...e, name: canonicalName, imageUrls: [...e.imageUrls] });
    } else {
      appendUniqueUrls(prev.imageUrls, e.imageUrls);
      if (prev.hexCode == null && e.hexCode != null) prev.hexCode = e.hexCode;
      if (prev.existingId == null && e.existingId != null) prev.existingId = e.existingId;
    }
  }
  return [...byKey.values()];
}
