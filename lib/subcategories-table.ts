/**
 * Detects Postgres "relation does not exist" when `subcategories` has not been created yet
 * (migration `drizzle/0014_independent_subcategories.sql` not applied).
 */
export const SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE =
  'The database has not been updated for the new subcategories feature yet. From your project folder in a terminal, run:  npm run db:migrate:subcategories  If that fails, in Supabase set DATABASE_URL in .env.local to the "direct" connection (port 5432), not 6543, then run the command again.';

export function isSubcategoriesTableMissingError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = e.code ?? (e.cause as Record<string, unknown> | undefined)?.code;
  if (code === "42P01") return true;
  const msg = String(e.message ?? "");
  if (!msg) return false;
  return (
    msg.includes("subcategories") &&
    (msg.includes("does not exist") || msg.includes("relation") || msg.includes("Failed query"))
  );
}
