/** One segment (letters around a hyphen): "t" + "shirt" → "T" + "Shirt". */
function capitalizeLabelSegment(segment: string): string {
  if (!segment) return segment;
  const lower = segment.toLocaleLowerCase();
  return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
}

/**
 * Title case for catalog labels: whitespace-separated words, hyphenated parts each capitalized
 * (e.g. `black t-shirt` → `Black T-Shirt`). Used for admin saves and storefront display.
 */
export function formatProductNameTitleCase(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return name;
  return trimmed
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => capitalizeLabelSegment(part))
        .join("-"),
    )
    .join(" ");
}
