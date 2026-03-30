/** Stable key for a variant combo row (matrix state + React keys). */
export function comboKey(optionNames: string[], values: Record<string, string>): string {
  return optionNames.map((n) => `${n}=${values[n] ?? ""}`).join("&");
}

export function buildOptionCombos(options: { name: string; values: string[] }[]): Record<string, string>[] {
  if (options.length === 0) return [];
  let rows: Record<string, string>[] = [{}];
  for (const o of options) {
    const next: Record<string, string>[] = [];
    for (const row of rows) {
      for (const v of o.values) {
        next.push({ ...row, [o.name]: v });
      }
    }
    rows = next;
  }
  return rows;
}

/** Product name → initials for SKU prefix (e.g. "Baggy Jeans" → "BJ"). */
export function abbreviateProductNameForSku(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((w) => w.length > 0);
  if (words.length === 0) return "PRD";
  return words
    .slice(0, 6)
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 8);
}

/** Single segment of an auto-generated SKU from an option display value. */
export function slugifySkuPart(value: string): string {
  const s = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s.slice(0, 24) : "X";
}

/**
 * One SKU per combo: `[Abbr]-[Opt1]-[Opt2]-...`, globally unique within this generation pass.
 */
export function generateSkusForMatrix(
  productName: string,
  optionNames: string[],
  combos: Record<string, string>[],
): string[] {
  const abbr = abbreviateProductNameForSku(productName);
  const used = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i]!;
    const parts = optionNames.map((n) => slugifySkuPart(combo[n] ?? ""));
    let base = [abbr, ...parts].filter((p) => p.length > 0).join("-");
    if (!base) base = `SKU-${i + 1}`;
    let candidate = base;
    let n = 1;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    used.add(candidate);
    out.push(candidate);
  }
  return out;
}
