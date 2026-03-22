# VAULT — Website Hardening & Architecture Audit

**Role framing:** Senior full-stack engineer and cybersecurity auditor (Next.js, TypeScript, OWASP Top 10).  
**Scope:** Codebase review of structural flaws, security risks, performance bottlenecks, and remediation.  
**Date:** 2026-03-17  

---

## Table of contents

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

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` — `cspHeader` (`connect-src`, `img-src`, `script-src`) |
| **Risk level** | Medium |
| **The flaw** | CSP allows Clerk, Supabase, and specific image sources (e.g. Pexels). Product images may be served from Cloudflare R2; `next.config.ts` defines `images.remotePatterns` for R2. If the R2 hostname changes or additional third-party hosts are introduced, CSP and `remotePatterns` can drift out of sync. |
| **The why** | Worst case: broken images or blocked client requests in production, or (if CSP is later loosened globally) weaker XSS-related protections. |
| **Recommendation** | Keep CSP `img-src` / `connect-src` aligned with every hostname the browser actually loads (Clerk, Supabase storage, R2 public URL pattern). Prefer environment-driven host allowlists in one place if you add more CDNs. |

### Flaw: Rate limiting fails open when Redis errors or is unset

| Field | Detail |
|--------|--------|
| **Location** | `lib/rate-limit.ts` (`catch` returns `allowed: true`); `middleware.ts` (no limiter if Redis init fails) |
| **Risk level** | Medium |
| **The flaw** | When Upstash is unavailable or misconfigured, sensitive operations are not throttled. |
| **The why** | Abuse (promo probing, `placeOrder`, sign-in failure audit posts) can spike—cost, noise, DB write pressure. |
| **Recommendation** | In production, consider failing closed for selected routes, add WAF/edge limits, and alert on Redis errors. Document operational dependency on Upstash. |

### Flaw: Guest account completion has no dedicated rate limit

| Field | Detail |
|--------|--------|
| **Location** | `actions/registerFromOrder.ts` |
| **Risk level** | Medium |
| **The flaw** | No IP- or key-based rate limit on this server action. |
| **The why** | Attackers can spam Clerk `createUser` / `getUserList` and DB reads (cost, quota). Activation tokens are hard to guess, but the endpoint remains abuse-prone. |
| **Recommendation** | Rate limit by IP (and optionally by `orderId`) using the same Redis pattern as `placeOrder` / `validatePromoCode`. |

### Flaw: Admin authorization is duplicated; session claims can lag

| Field | Detail |
|--------|--------|
| **Location** | `middleware.ts` plus many `actions/*.ts` and `app/admin/**/page.tsx` checks for `sessionClaims?.metadata?.role !== "admin"` |
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

| Field | Detail |
|--------|--------|
| **Location** | `app/[storeType]/page.tsx` — `Promise.all` for products, hero, lookbook, categories, slugs |
| **Risk level** | Low |
| **The why** | Under load, TTFB and pool usage can grow. |
| **Recommendation** | Cache stable slices (`unstable_cache` / ISR); tune indexes for hot queries. |

### Flaw: Indexes may lag query patterns

| Field | Detail |
|--------|--------|
| **Location** | `db/schema.ts` — e.g. `products` has `products_store_type_idx`; shop may filter `is_visible`, `store_type`, `category_slug` together |
| **Risk level** | Low–Medium at scale |
| **Recommendation** | Add composite indexes matching real `WHERE` clauses used in shop/listing queries. |

### Flaw: Possibly unused heavy dependencies

| Field | Detail |
|--------|--------|
| **Location** | `package.json` — `@ffmpeg/ffmpeg`, `@ffmpeg/util` (no references found in app `*.ts` / `*.tsx`) |
| **Risk level** | Low |
| **Recommendation** | Remove if unused to shrink install surface and confusion. |

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

| Priority | Item |
|----------|------|
| P1 | Align CSP with every browser-facing host (Clerk, Supabase, R2, etc.) and keep in sync with `next.config` images |
| P2 | Rate limit `registerFromOrder`; monitor Redis fail-open behavior |
| P3 | Centralize admin checks; document Clerk role/session refresh |
| P4 | Composite DB indexes + optional caching for home/shop |
| P5 | Retention policy for `audit_logs` / notifications; remove unused deps (e.g. FFmpeg if unused) |
| P6 | Resolve `/api/upload` middleware vs routes; trim `promoCodeId` from public promo validation response |

---

*This document reflects a point-in-time review; re-run after major feature or dependency changes.*
