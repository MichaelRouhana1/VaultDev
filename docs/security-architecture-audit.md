# VAULT — Website Hardening & Architecture Audit

**Role framing:** Senior full-stack engineer and cybersecurity auditor (Next.js, TypeScript, OWASP Top 10).  
**Scope:** Codebase review of structural flaws, security risks, performance bottlenecks, and remediation.  
**Original review date:** 2026-03-17  

---

## Remediation tracker

**Last updated:** 2026-03-17 (P5 retention cleanup + FFmpeg removed)  

### How to maintain this document

Whenever you implement or partially fix an item from this audit **in the same PR / change**, update:

1. **This tracker** — set the row status to **Done** or **Partial** and add a short note + file references.  
2. **`Last updated`** — set to the date of the change.  
3. **Summary priority list** (below) — keep it in sync with this table.

If a flaw is fully resolved, you may add a one-line **Status** under that flaw’s section (e.g. “**Status:** Done — see tracker P1”).

| ID | Item | Status | Notes |
|----|------|--------|--------|
| **P1** | CSP + `next/image` hosts aligned, env-driven Supabase/R2 | **Done** | `lib/constants/security-hosts.ts` builds CSP (`buildContentSecurityPolicy`) and `getImageRemotePatterns()`; consumed by `middleware.ts` and `next.config.ts`. Optional PostHog connect origin only if `NEXT_PUBLIC_POSTHOG_HOST` is set. |
| **P2** | Rate limits + Redis degradation visibility | **Done** | `registerFromOrder`: `checkRegisterFromOrderLimit` (10/hour/IP) in `lib/rate-limit.ts`; `actions/registerFromOrder.ts`. Redis errors: `AUTH_REDIS_ERROR` + `logAuthRedisError` in `checkRateLimit` (with `auditIp` on call sites). Middleware admin/upload limiter: `RATE_LIMIT_EXCEEDED` via `submitInternalSecurityAuditAsync` **before** 429; Redis failures → `AUTH_REDIS_ERROR` with `req.nextUrl.origin`. Ingest: `lib/internal-security-audit-ingest.ts`. UI labels: `lib/audit-log-display.ts`. **Still by design:** limiters **fail-open** on Redis outage (availability); use logs + `AUTH_REDIS_ERROR` rows for monitoring; fail-closed/WAF called out as future hardening. |
| **P3** | Centralize admin auth + redundant RSC/action checks; Clerk role docs | **Done** | `lib/security.ts`: `checkAdminSession`, `requireAdmin`, `requireAdminAction`, `UNAUTHORIZED_ADMIN_ACTION_RESPONSE`. `app/admin/layout.tsx` calls `requireAdmin()`. Server actions updated: `createProduct`, `updateProduct`, `deleteProduct`, `updateOrderStatus`, `bulk-discount` (all exports), `admin-store` (`setAdminStoreType`, `migrateMissingStoreTypes`; `getAdminStoreType` uses `checkAdminSession`), `hero.ts`, `lookbook.ts`. **Docs:** `docs/clerk-roles.md`. Other admin actions still use inline `auth()` until migrated in a follow-up. |
| **P4** | Composite DB indexes + storefront request dedupe (`cache`) | **Done** | `db/schema.ts`: `products_store_type_visible_idx`, `products_category_slug_idx`; `product_categories_home_idx`; `lookbook_items_store_type_idx`; `product_colors_product_id_idx`; `product_variants_product_id_idx` (drops legacy `products_store_type_idx`). **Migration:** `drizzle/0011_p4_storefront_indexes.sql` — **not applied** by this change; run when ready (see AGENTS / DBA). **React `cache`:** `actions/categories.ts` (public reads), `actions/hero.ts` `getHeroImages`, `actions/lookbook.ts` `getLookbookSectionVisible` + `getLookbookItems`, `actions/storefront-products.ts` (shop/home/PDP queries). **Pages** use `storefront-products` helpers. Barrel: `actions/index.ts`. |
| **P5** | Retention for `audit_logs` / notifications; remove dead deps (e.g. FFmpeg) | **Done** | `actions/admin-cleanup.ts` `runRetentionCleanup()` — `requireAdmin()`, Drizzle `lt()` vs `Date` cutoffs (audit 30d, read notifications 14d), transactional deletes + counts; `RetentionCleanupButton` on `app/admin/logs/page.tsx`. Audit action `retention.cleanup` → `RETENTION_CLEANUP`. Removed `@ffmpeg/ffmpeg`, `@ffmpeg/util` from `package.json`. |
| **P6** | `/api/upload` vs middleware matcher; trim `promoCodeId` from public promo response | **Not started** | — |

### Partially addressed elsewhere (not mapped to P1–P6)

| Topic | Status | Notes |
|-------|--------|--------|
| Silent `fetch().catch` on admin audit from middleware | **Partial** | `AUTH_FAILED_ADMIN` path still fire-and-forget; rate-limit path uses awaited ingest. Consider aligning or metrics. |
| `placeOrder` throws validation errors to client | **Not started** | Still `throw new Error` on validation failure. |
| Newsletter stub | **Not started** | `components/NewsletterForm.tsx` |

---

## Table of contents

0. [Remediation tracker](#remediation-tracker)
1. [Security & privacy](#1-security--privacy)
2. [Development practices & code quality](#2-development-practices--code-quality)
3. [Performance & scalability](#3-performance--scalability)
4. [Usability & UX (accessibility)](#4-usability--ux-accessibility)
5. [Privacy & compliance](#5-privacy--compliance)
6. [Overall architecture](#6-overall-architecture)
7. [Summary priority list](#summary-priority-list)

---

## 1. Security & privacy

### Flaw: Content Security Policy may not match all asset origins

**Status:** **Done** (tracker **P1**) — single module `lib/constants/security-hosts.ts`.

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` — CSP via `buildContentSecurityPolicy` from `lib/constants/security-hosts.ts` |
| **Risk level** | Medium |
| **The flaw** | CSP allows Clerk, Supabase, and specific image sources (e.g. Pexels). Product images may be served from Cloudflare R2; `next.config.ts` defines `images.remotePatterns` for R2. If the R2 hostname changes or additional third-party hosts are introduced, CSP and `remotePatterns` can drift out of sync. |
| **The why** | Worst case: broken images or blocked client requests in production, or (if CSP is later loosened globally) weaker XSS-related protections. |
| **Recommendation** | Keep CSP `img-src` / `connect-src` aligned with every hostname the browser actually loads (Clerk, Supabase storage, R2 public URL pattern). Prefer environment-driven host allowlists in one place if you add more CDNs. |

### Flaw: Rate limiting fails open when Redis errors or is unset

**Status:** **Partial** — still fail-open, but **P2** adds `AUTH_REDIS_ERROR` audit + high-severity console logs; middleware documents degraded admin/upload limiting.

| Field | Detail |
|--------|--------|
| **Location** | `lib/rate-limit.ts` (`catch` returns `allowed: true` after audit); `middleware.ts` (no limiter if Redis env missing; catch audited) |
| **Risk level** | Medium |
| **The flaw** | When Upstash is unavailable or misconfigured, sensitive operations are not throttled. |
| **The why** | Abuse (promo probing, `placeOrder`, sign-in failure audit posts) can spike—cost, noise, DB write pressure. |
| **Recommendation** | In production, consider failing closed for selected routes, add WAF/edge limits, and alert on Redis errors. Document operational dependency on Upstash. |

### Flaw: Guest account completion has no dedicated rate limit

**Status:** **Done** (tracker **P2**) — `checkRegisterFromOrderLimit` (IP, 10/hour) + `RATE_LIMIT_EXCEEDED` on block.

| Field | Detail |
|--------|--------|
| **Location** | `actions/registerFromOrder.ts` + `lib/rate-limit.ts` |
| **Risk level** | Medium |
| **The flaw** | No IP- or key-based rate limit on this server action. |
| **The why** | Attackers can spam Clerk `createUser` / `getUserList` and DB reads (cost, quota). Activation tokens are hard to guess, but the endpoint remains abuse-prone. |
| **Recommendation** | Rate limit by IP (and optionally by `orderId`) using the same Redis pattern as `placeOrder` / `validatePromoCode`. |

### Flaw: Admin authorization is duplicated; session claims can lag

**Status:** **Partial** (tracker **P3**) — centralized helpers in `lib/security.ts` + admin layout + listed high-risk actions; remaining admin pages/actions may still duplicate checks.

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` plus `requireAdmin` / `requireAdminAction` in admin layout and sensitive actions; other `actions/*.ts` / `app/admin/**/page.tsx` may still use inline `auth()` |
| **Risk level** | Low–Medium |
| **The flaw** | Role checks are repeated; Clerk JWT/session may not reflect dashboard role changes until refresh. |
| **The why** | A future feature could omit a server-side check; stale roles could briefly apply. |
| **Recommendation** | Centralize `assertAdmin()` in e.g. `lib/auth-admin.ts` and use it in every admin server action and sensitive RSC. Document Clerk session/metadata refresh. Consider Organizations or server-side role source of truth for stricter models. |

### Flaw: `validatePromoCode` returns internal `promoCodeId`

| Field | Detail |
|--------|--------|
| **Location** | `actions/promo.ts` |
| **Risk level** | Low |
| **The flaw** | Client receives database promo row id. |
| **The why** | Minor information disclosure; can aid correlation with other issues. |
| **Recommendation** | Return only fields the UI needs (e.g. discount amount, type, normalized code); keep `promoCodeId` server-only inside `placeOrder`’s transaction. |

### Flaw: Server action validation errors may over-expose detail

| Field | Detail |
|--------|--------|
| **Location** | `actions/placeOrder.ts` — `throw new Error(message)` on validation failure |
| **Risk level** | Low |
| **The flaw** | Structured validation messages can reach the client. |
| **The why** | Slightly easier input probing. |
| **Recommendation** | Return a generic client message; log detailed validation failures server-side with `logger`. |

### Positive notes (security)

- **SQL injection:** Drizzle parameterized queries; `lib/product-search.ts` sanitizes user tokens before `to_tsquery`; `sql.raw("search_vector")` is a fixed identifier, not user input.
- **Sessions / access:** Clerk manages session cookies; `/account` and `/admin` protected in middleware; checkout success binds display to `userId` or `orderId` + activation token (`app/checkout/success/page.tsx`, `lib/order-activation.ts`).
- **Internal API:** `app/api/internal/security-audit/route.ts` gated by `INTERNAL_AUDIT_SECRET`.
- **Uploads:** `lib/security.ts` (type, size, filename); HEIC conversion admin-only (`actions/convertHeic.ts`).
- **`placeOrder`:** Binds `userId` to the signed-in session when a client claims a user id (`actions/placeOrder.ts`).

---

## 2. Development practices & code quality

### Flaw: Silent error swallowing

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` — `fetch(.../security-audit).catch(() => {})`; Redis limit `catch { }` |
| **Risk level** | Low |
| **The flaw** | Failures produce no actionable signal without external monitoring. |
| **Recommendation** | Structured logging or metrics for audit ingest and limiter failures. |

### Flaw: Logger may emit stack traces in production

| Field | Detail |
|--------|--------|
| **Location** | `lib/logger.ts` — `parseError` includes `stack` |
| **Risk level** | Low |
| **The why** | Log sinks may retain internal paths. |
| **Recommendation** | Omit or truncate stacks in production. |

### Flaw: `skipLibCheck` in TypeScript

| Field | Detail |
|--------|--------|
| **Location** | `tsconfig.json` |
| **Risk level** | Low |
| **Recommendation** | Acceptable for velocity; optionally run with `skipLibCheck: false` in CI periodically. |

### Flaw: Newsletter form is non-functional UI

| Field | Detail |
|--------|--------|
| **Location** | `components/NewsletterForm.tsx` |
| **Risk level** | Low (UX / trust) |
| **Recommendation** | Wire to a provider or remove until implemented. |

### Positive notes

- **Zod** used on critical paths (`placeOrder`, `registerFromOrder`, promos, internal audit body).
- **`lib/security.ts`** centralizes XSS/file/href helpers.

---

## 3. Performance & scalability

### Flaw: Homepage aggregates multiple DB reads

**Status:** **Partial** — React `cache()` on category/hero/lookbook/storefront product helpers dedupes per request; optional ISR/`unstable_cache` still available.

| Field | Detail |
|--------|--------|
| **Location** | `app/[storeType]/page.tsx` — `Promise.all` for products, hero, lookbook, categories, slugs |
| **Risk level** | Low |
| **The why** | Under load, TTFB and pool usage can grow. |
| **Recommendation** | Add `unstable_cache` / ISR for anonymous home if needed; indexes from P4 help DB side. |

### Flaw: Indexes may lag query patterns

**Status:** **Done** (tracker **P4**) — see `products_store_type_visible_idx`, `products_category_slug_idx`, related indexes; apply `drizzle/0011_p4_storefront_indexes.sql` when ready.

| Field | Detail |
|--------|--------|
| **Location** | `db/schema.ts` — composite + slug indexes aligned with shop/home/PDP filters |
| **Risk level** | Low–Medium at scale |
| **Recommendation** | Revisit if new filters (e.g. full-text-only paths) dominate query plans. |

### Flaw: Possibly unused heavy dependencies

| Field | Detail |
|--------|--------|
| **Location** | `package.json` — `@ffmpeg/ffmpeg`, `@ffmpeg/util` (no references found in app `*.ts` / `*.tsx`) |
| **Risk level** | Low |
| **Recommendation** | Remove if unused to shrink install surface and confusion. |

**Status:** Done — FFmpeg packages removed (P5).

### Flaw: Server Actions body size limit

| Field | Detail |
|--------|--------|
| **Location** | `next.config.ts` — `experimental.serverActions.bodySizeLimit: "4mb"` |
| **Risk level** | Low |
| **Recommendation** | Align with `lib/security.ts` limits; prefer presigned uploads to object storage for large media. |

### Positive notes

- **Images:** `next.config.ts` `remotePatterns` for optimization.
- **`placeOrder`:** Transactional flow with batched product fetch and atomic stock/promo updates.

---

## 4. Usability & UX (accessibility)

### Flaw: Inconsistent a11y coverage

| Field | Detail |
|--------|--------|
| **Location** | Storefront and admin UI broadly |
| **Risk level** | Low |
| **Recommendation** | Run axe/Lighthouse on `/`, `/checkout`, `/admin`; verify focus traps in dialogs, table semantics, and labels for icon-only controls. |

### Flaw: Responsive / ultra-wide coverage not fully verified

| Field | Detail |
|--------|--------|
| **Risk level** | Low |
| **Recommendation** | Test checkout and admin tables at narrow and very wide widths; horizontal scroll for wide tables where needed. |

### Positive notes

- Skip link in `app/layout.tsx` (`#main-content`).

---

## 5. Privacy & compliance

### Flaw: Audit and notification retention not defined in code

| Field | Detail |
|--------|--------|
| **Location** | `audit_logs`, `notifications` in `db/schema.ts` |
| **Risk level** | Medium (governance) |
| **The why** | Retention/minimization policies may require archival or deletion jobs. |
| **Recommendation** | Document retention; scheduled purge/archive; least-privilege access to exports (e.g. `getContactExport`). |

**Status:** Partial — manual admin prune (30d audit logs, 14d read notifications) via `runRetentionCleanup` on Security logs; no scheduled job (Vercel/cron not in scope). Archive/export still optional follow-up.

### Flaw: Account deletion vs. order records

| Field | Detail |
|--------|--------|
| **Location** | `actions/deleteAccount.ts` — anonymizes PII on orders, deletes wishlists, deletes Clerk user |
| **Risk level** | Low (often legally required to retain orders) |
| **Recommendation** | Privacy policy should state retention of transactional records; optional manual erasure flow where law permits. |

### Positive notes

- **`adminStore` cookie:** `httpOnly`, `sameSite: "strict"`, `secure` in production (`actions/admin-store.ts`).

---

## 6. Overall architecture

### Flaw: Middleware rate-limit path references `/api/upload` without a matching route

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` vs `app/api` (only audit routes present in tree at time of audit) |
| **Risk level** | Low |
| **Recommendation** | Remove the `/api/upload` branch or implement and document the route. |

### Flaw: Admin RSC pages rely primarily on middleware for gatekeeping

| Field | Detail |
|--------|--------|
| **Location** | e.g. `app/admin/orders/[id]/page.tsx` loads order by id without a local `auth()` check |
| **Risk level** | Low |
| **Recommendation** | Optional redundant `auth()` + admin assert on sensitive pages if middleware matcher ever changes. |

### Positive notes

- Stack alignment: Next.js 15 App Router + Drizzle + Clerk + Zod is industry-standard.
- Clear split between `actions/`, `components/`, and `lib/`.
- Failed admin access can be logged via internal audit from middleware.

---

## Summary priority list

| Priority | Item | Status |
|----------|------|--------|
| P1 | Align CSP with every browser-facing host (Clerk, Supabase, R2, etc.) and keep in sync with `next.config` images | **Done** |
| P2 | Rate limit `registerFromOrder`; monitor Redis fail-open behavior (`AUTH_REDIS_ERROR`, middleware `RATE_LIMIT_EXCEEDED` before 429) | **Done** |
| P3 | Centralize admin checks; document Clerk role/session refresh | **Done** — see `lib/security.ts`, `docs/clerk-roles.md` |
| P4 | Composite DB indexes + optional caching for home/shop | **Done** — see tracker |
| P5 | Retention policy for `audit_logs` / notifications; remove unused deps (e.g. FFmpeg if unused) | **Done** — see tracker |
| P6 | Resolve `/api/upload` middleware vs routes; trim `promoCodeId` from public promo validation response | **Not started** |

---

*Keep the [Remediation tracker](#remediation-tracker) and this table aligned after each audit fix. Re-run a full review after major feature or dependency changes.*
