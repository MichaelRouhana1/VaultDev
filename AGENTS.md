# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

VAULT is a fashion e-commerce Next.js 15 app (App Router, Turbopack, React 19, Tailwind CSS v4, Drizzle ORM, Clerk auth, Supabase Storage). See `package.json` for all scripts.

### Required secrets (injected as env vars)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL (pooler, port 6543) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage (server) |
| `RESEND_API_KEY` | Optional — order emails |
| `UPSTASH_REDIS_REST_URL` | Optional — Upstash Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional — Upstash Redis token |
| `INTERNAL_AUDIT_SECRET` | Optional — shared secret so Edge middleware can persist admin access denials to `audit_logs` via `/api/internal/security-audit` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional — PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional — PostHog API host (default: https://us.i.posthog.com) |

These must be written to `.env.local` before the app can start. See `.env.example` for a template. The update script handles this automatically from injected environment variables.

### Gotchas

- **npm install requires `--legacy-peer-deps`** due to a peer dependency conflict between `@clerk/nextjs` and `react@19.1.0`. Always use `npm install --legacy-peer-deps`.
- **`drizzle-kit push` hangs on the Supabase pooler connection** (port 6543 / PgBouncer transaction mode). For schema operations, use the Supabase direct connection (`db.<project-ref>.supabase.co:5432`). The pooler connection works fine for the app at runtime.
- **Clerk dev mode returns HTTP 500 for non-browser requests** (e.g. `curl`). This is expected — the `x-clerk-auth-reason: dev-browser-missing` header confirms Clerk needs a browser with its dev-browser cookie. Always test the app in a real browser.
- **`postinstall` hook runs `patch-package`** to apply `patches/drizzle-kit+0.31.9.patch`. This runs automatically during `npm install`.

### Common commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (starts on `localhost:3000`) |
| Lint | `npm run lint` |
| Build | `npm run build` |
| DB schema push | `npx drizzle-kit push` |
| DB migrations | `npm run db:migrate:all` |
| Audit logs table | `npm run db:migrate:audit` |
| Notifications table | `npm run db:migrate:notifications` |
