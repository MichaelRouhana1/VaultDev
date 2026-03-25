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

### Required: put public metadata on the session token

Setting **Public metadata** in the user profile is **not enough** by itself. VAULT checks `sessionClaims.metadata.role` (the **session JWT**), which only contains what you add under **Sessions → Customize session token**.

1. In [Clerk Dashboard](https://dashboard.clerk.com), open your application.
2. Go to **Sessions** (or **Configure → Sessions**).
3. Find **Customize session token** (Claims editor).
4. Add a claim so `public_metadata` is exposed as `metadata` (matches `middleware.ts` / `lib/security.ts`):

   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

   If you already have other custom claims, merge `metadata` into that JSON object (do not duplicate top-level keys).

5. **Save** the session token template.

Without this step, `sessionClaims.metadata` is undefined and `/admin` will always redirect home even with `{ "role": "admin" }` on the user.

Use **public** metadata (not private) on the user so it is safe to embed in the JWT.

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
