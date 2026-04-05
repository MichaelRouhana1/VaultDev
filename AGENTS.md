# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

VAULT is a fashion e-commerce Next.js 15 app (App Router, Turbopack, React 19, Tailwind CSS v4, Drizzle ORM, Clerk auth, Supabase Storage). See `package.json` for all scripts.

### Required secrets (injected as env vars)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL (pooler, port 6543) |
| `NEXT_PUBLIC_APP_URL` | Optional but recommended — absolute site URL for order email links (`/activate-account`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional but recommended: `/sign-in` — keeps sign-in on your domain so `appearance` styling applies |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional but recommended: `/sign-up` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage (server) |
| `RESEND_API_KEY` | Optional — order emails |
| `UPSTASH_REDIS_REST_URL` | Optional — Upstash Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional — Upstash Redis token |
| `INTERNAL_API_SECRET` | Optional — shared secret for `x-mosaik-internal-secret` when calling `/api/internal/security-audit` (middleware + `lib/internal-security-audit-ingest.ts`). Legacy: `INTERNAL_AUDIT_SECRET` is read if this is unset. |
| `CLERK_FRONTEND_API_URL` | Optional — required when Clerk **Domains** uses a custom Frontend API (e.g. `https://clerk.yourdomain.com`). Adds that origin to CSP `connect-src` / `script-src` so the Clerk client can load (`lib/constants/security-hosts.ts`). `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` is also read. |

These must be written to `.env.local` before the app can start. See `.env.example` for a template. The update script handles this automatically from injected environment variables.

### Gotchas

- **npm install / Vercel:** Root **`.npmrc`** sets `legacy-peer-deps=true` (peer conflict between `@clerk/nextjs` and `react@19.1.0`). You can still run `npm install --legacy-peer-deps` explicitly if needed.
- **`drizzle-kit push` hangs on the Supabase pooler connection** (port 6543 / PgBouncer transaction mode). For schema operations, use the Supabase direct connection (`db.<project-ref>.supabase.co:5432`). The pooler connection works fine for the app at runtime.
- **Clerk dev mode returns HTTP 500 for non-browser requests** (e.g. `curl`). This is expected — the `x-clerk-auth-reason: dev-browser-missing` header confirms Clerk needs a browser with its dev-browser cookie. Always test the app in a real browser.
- **Clerk hosted Account Portal (`*.accounts.dev`)** does not use your in-code `appearance` object. Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` in `.env.local`, open **`http://localhost:3000/sign-in`**, and in the Clerk Dashboard align “Application paths” with those routes if redirects still go to the portal.
- **Clerk custom Frontend API domain:** If the dashboard shows Frontend API `clerk.yourdomain.com`, set **`CLERK_FRONTEND_API_URL=https://clerk.yourdomain.com`** in Vercel (and locally). Otherwise CSP blocks `https://clerk.yourdomain.com/v1/environment` and sign-in/social providers break. See [Clerk CSP](https://clerk.com/docs/security/clerk-csp).
- **Admin role:** Store managers need `publicMetadata.role = "admin"` in Clerk; sessions may need sign-out/sign-in to pick up changes. See **`docs/clerk-roles.md`** and `lib/security.ts` (`requireAdmin`, `requireAdminAction`).
- **`ECONNRESET` / `Error: aborted`** in dev is often a dropped request (tab close, fast refresh, navigation mid-fetch, or flaky network) — not necessarily a bug in auth styling.
- **`postinstall` hook runs `patch-package`** to apply `patches/drizzle-kit+0.31.9.patch`. This runs automatically during `npm install`.

### Common commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (starts on `localhost:3000`) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| DB schema push | `npx drizzle-kit push` |
| DB migrations | `npm run db:migrate:all` |
| P4 catalog indexes (optional SQL) | After backup, run `drizzle/0011_p4_storefront_indexes.sql` against Postgres (or fold into your migration runner). Not auto-run by repo scripts. |
| Audit logs table | `npm run db:migrate:audit` |
| Notifications table | `npm run db:migrate:notifications` |
| Order activation columns | `npm run db:migrate:order-activation` |
