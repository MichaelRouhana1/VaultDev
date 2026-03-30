import { slugifyOptionValue } from "@/lib/utils";

/** True for catalog color dimensions used to link `product_option_values.product_color_id`. */
export function isColorOptionName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "color" || n === "colour";
}

/** Normalized color profile name → `product_colors.id` (trim + lowercase keys). */
export function buildColorNameToProfileIdMap(
  profiles: ReadonlyArray<{ id: number; name: string }>,
): Map<string, number> {
  return new Map(profiles.map((c) => [c.name.trim().toLowerCase(), c.id] as const));
}

/** Resolves `product_color_id` when inserting/updating a `product_option_values` row. */
export function productColorIdForOptionValue(
  optionName: string,
  valueDisplayTrimmed: string,
  colorNameToId: Map<string, number>,
): number | null {
  if (!isColorOptionName(optionName)) return null;
  return colorNameToId.get(valueDisplayTrimmed.toLowerCase()) ?? null;
}

export type ProductOptionPayload = { name: string; values: string[] };

export type ProductVariantRowPayload = {
  sku: string;
  stock_quantity: number;
  price_override?: number | null;
  optionValues: Record<string, string>;
};

export function resolveLegacyVariantColorId(
  row: ProductVariantRowPayload,
  options: ProductOptionPayload[],
  colorNameToId: Map<string, number>,
  fallbackColorId: number,
): number {
  const colorOpt = options.find((o) => isColorOptionName(o.name));
  if (!colorOpt) return fallbackColorId;
  const raw = row.optionValues[colorOpt.name];
  if (raw == null) return fallbackColorId;
  const id = colorNameToId.get(raw.trim().toLowerCase());
  return id ?? fallbackColorId;
}

export function resolveLegacyVariantSize(
  row: ProductVariantRowPayload,
  options: ProductOptionPayload[],
): string {
  const sizeOpt = options.find((o) => o.name.trim().toLowerCase() === "size");
  if (sizeOpt) {
    const s = row.optionValues[sizeOpt.name];
    if (s != null && s.trim() !== "") return s.trim();
  }
  const parts: string[] = [];
  for (const o of options) {
    if (isColorOptionName(o.name)) continue;
    const v = row.optionValues[o.name];
    if (v != null && v.trim() !== "") parts.push(v.trim());
  }
  return parts.length > 0 ? parts.join(" / ") : "DEFAULT";
}

export function allocateUniqueOptionValueSlug(base: string, used: Set<string>): string {
  let candidate = slugifyOptionValue(base);
  let n = 0;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${slugifyOptionValue(base)}-${n}`;
  }
  used.add(candidate);
  return candidate;
}
