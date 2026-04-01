/**
 * Clerk session `publicMetadata.role` (surfaced as `sessionClaims.metadata.role`) for admin UI access.
 */
export function isDashboardRole(role: unknown): boolean {
  return role === "admin" || role === "superadmin";
}
