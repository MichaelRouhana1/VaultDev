# Clerk admin role (VAULT)

## How we enforce admin

- **Middleware** (`middleware.ts`) requires a signed-in user on `/admin/*` and checks `sessionClaims.metadata.role === "admin"`.
- **Admin layout** (`app/admin/layout.tsx`) calls `requireAdmin()` from `lib/security.ts` so the admin shell does not render without the same check (defense in depth).
- **Server actions** use `requireAdminAction()` (JSON error) or `requireAdmin()` (redirect) from `lib/security.ts` before mutating data.

The app reads the role from the **session token / JWT claims**, not from `currentUser()` on every call. In code this is `sessionClaims?.metadata?.role` (Clerk maps **public metadata** into session claims when the JWT template includes it).

## Assigning `admin` in the Clerk Dashboard

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Users**.
2. Select the user who should manage the store.
3. Under **Metadata**, edit **Public metadata** and set JSON like:

   ```json
   { "role": "admin" }
   ```

4. Save.

Use **public** metadata (not private) so it can be exposed in the session token. Ensure your Clerk **JWT template** (Sessions → customize session token) includes `metadata` / `role` if you use a custom template; the default Clerk+Next.js setup often exposes `publicMetadata` under `sessionClaims.metadata` depending on your template.

## When role changes take effect

Changing metadata in the Dashboard **does not always update an already-issued session immediately**. The user may need to:

- **Sign out and sign in again**, or  
- Wait for the session to refresh (depends on Clerk session lifetime and client behavior).

Until the new claims are in the JWT, `requireAdmin()` / `requireAdminAction()` will still see the old role. Plan role changes accordingly and communicate to admins if they report “access denied” right after being promoted.

## Code reference

| Helper | Use when |
|--------|-----------|
| `checkAdminSession()` | Need a boolean / branch without redirect |
| `requireAdmin()` | RSC or action should `redirect("/")` if not admin |
| `requireAdminAction({ auditTarget })` | Action should return `{ success: false, error: "Unauthorized: …" }` |

All helpers live in **`lib/security.ts`**.
