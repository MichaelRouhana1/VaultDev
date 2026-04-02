import { sql, type SQL } from "drizzle-orm";

const MIN_QUERY_LENGTH = 2;

/**
 * Sanitizes and formats user input for PostgreSQL full-text search with prefix matching.
 * - Trims whitespace
 * - Removes special characters that break to_tsquery (&, |, !, (, ), :)
 * - Keeps only alphanumeric, hyphen, underscore per token
 * - Appends :* to each token for prefix matching (e.g. "denim jac" → "denim:* & jac:*")
 */
/** Exposed for search ranking / server actions that need the same tsquery string as `buildProductSearchWhere`. */
export function getFormattedPrefixTsquery(input: string): string | null {
  return formatPrefixQuery(input);
}

function formatPrefixQuery(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) return null;

  const tokens = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[^\w-]/g, "").toLowerCase())
    .filter((token) => token.length >= MIN_QUERY_LENGTH);

  if (tokens.length === 0) return null;

  return tokens.map((t) => `${t}:*`).join(" & ");
}

/**
 * Builds a Drizzle SQL fragment for full-text search on products.
 * Uses prefix matching so partial words match (e.g. "denim jac" matches "denim jacket").
 *
 * @param query - Raw user input
 * @returns SQL fragment for `search_vector @@ to_tsquery(...)`, or undefined if query is invalid
 */
export function buildProductSearchWhere(query: string): SQL | undefined {
  const formatted = formatPrefixQuery(query);
  if (!formatted) return undefined;

  return sql`${sql.raw("search_vector")} @@ to_tsquery('english', ${formatted})`;
}
