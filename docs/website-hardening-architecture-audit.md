# Website Hardening & Architecture Audit

**Scope:** Next.js 15 (App Router), React 19, Drizzle ORM, Clerk, Supabase/R2, Upstash Redis (optional).  
**Method:** Review of `package.json`, `middleware.ts`, `next.config.ts`, `db/schema.ts`, security utilities, API routes, critical server actions, and representative storefront/admin flows.  
**Date:** 2025-03-23  
**Update:** 2025-03-23 — PostHog analytics removed from the codebase (no third-party analytics SDK; CSP `connect-src` no longer whitelists PostHog).

## Executive summary

The codebase shows deliberate OWASP-oriented choices: Clerk for auth, Drizzle for parameterized queries, Zod on several boundaries, CSP with nonces wired into `ClerkProvider`, security headers in `next.config.ts`, admin gating in middleware plus server actions/layout, and optional Redis-backed rate limiting. The strongest residual risks are **secret-bearing URLs** (activation tokens) and **operational fail-open behavior** when Redis is down or unset. Several items below are **configuration or process** risks rather than code bugs.

**[RESOLVED: PostHog Analytics has been completely removed from the codebase, eliminating the third-party data leak vector that previously could have captured full URLs (including activation query parameters) in analytics.]**

---

## 1. Security & Privacy

### 1.1 Activation token exposed in query string (checkout success & email links)

| Field | Detail |
|--------|--------|
| **The Flaw** | Guest order activation uses a UUID passed as the `key` query parameter on `/checkout/success` and as `token` on `/activate-account`. Sensitive tokens in URLs are logged by proxies, visible in browser history, and may leak via the `Referer` header to third parties. |
| **Location** | `components/CheckoutForm.tsx` (redirect builds `key=`); `app/checkout/success/page.tsx`; `app/activate-account/page.tsx`; email templates if they embed the same pattern (`lib/resend.ts` or related). |
| **Risk Level** | **High** |
| **The Why** | Anyone with the URL can complete account takeover steps for that order window. Leaks amplify via support screenshots, shared links, and referrer leakage to any *future* third-party scripts or tools that record URLs. |
| **Recommendation** | Prefer a **short-lived, HttpOnly cookie** set server-side after validating token once, or a **POST + session** pattern; keep tokens out of query strings. If analytics or error reporting is reintroduced, never forward raw query strings containing `key` / `token`. |

### 1.2 ~~PostHog (or similar) may record full URLs including secrets~~ — **RESOLVED**

| Field | Detail |
|--------|--------|
| **Status** | **Removed.** `posthog-js`, `PostHogProvider`, and all `usePostHog` event captures have been removed. `NEXT_PUBLIC_POSTHOG_*` variables were removed from `.env.example`; CSP no longer adds a PostHog origin to `connect-src` (`lib/constants/security-hosts.ts`). |
| **Prior risk** | Activation tokens in `?key=` or `?token=` could have been sent to PostHog when enabled. |
| **Risk Level** | **N/A** (issue closed for this codebase) |

### 1.3 Rate limiting and admin throttling fail open when Redis errors or is unconfigured

| Field | Detail |
|--------|--------|
| **The Flaw** | When Upstash Redis is missing or throws, `checkRateLimit` and middleware admin limiting allow traffic (`allowed: true`) after logging/audit. |
| **Location** | `lib/rate-limit.ts` (`checkRateLimit` catch block); `middleware.ts` (admin `globalAdminLimiter` catch: “fail-open”). |
| **Risk Level** | **Medium** (elevates to **High** if you rely on Redis as the primary abuse control in production without WAF/alternate limits) |
| **The Why** | Attackers can brute-force promos, place-order spam, or hammer admin routes during Redis outages or misconfiguration. |
| **Recommendation** | For production, add **fail-closed** or stricter caps for sensitive actions when Redis is unavailable (e.g. allow only with lower concurrency via in-memory token bucket per instance, or edge/WAF rate limits). Document the tradeoff explicitly in runbooks. |

### 1.4 Internal audit ingestion has no application-layer rate limit

| Field | Detail |
|--------|--------|
| **The Flaw** | `/api/internal/security-audit` accepts POSTs authenticated only by `INTERNAL_AUDIT_SECRET` with no per-IP or global throttle in the route. |
| **Location** | `app/api/internal/security-audit/route.ts` |
| **Risk Level** | **Low** (becomes **Medium** if the shared secret is ever exposed) |
| **The Why** | A leaked secret enables unbounded writes to `audit_logs`, causing storage exhaustion and log integrity noise. |
| **Recommendation** | Add rate limiting (Redis or middleware) keyed by secret hash + IP; cap body size; consider mutual TLS or private network-only exposure in production. |

### 1.5 Admin role depends on Clerk JWT / session claims configuration

| Field | Detail |
|--------|--------|
| **The Flaw** | Admin checks use `sessionClaims?.metadata?.role === "admin"` (middleware and `lib/security.ts`). If the Clerk JWT template omits `metadata`, no one is admin; if mis-mapped, privilege escalation is possible. |
| **Location** | `middleware.ts`; `lib/security.ts`; various server actions using `auth()` + `sessionClaims`. |
| **Risk Level** | **Medium** (operational / **Critical** if dashboard misconfiguration ships to prod) |
| **The Why** | Broken access control is OWASP #1; misconfiguration is a common root cause. |
| **Recommendation** | Treat as **infrastructure-as-code**: document required Clerk settings (`docs/clerk-roles.md`), add a startup or CI check that verifies claims shape in a staging environment, and keep defense in depth (middleware + layout + each mutating action). |

### 1.6 CSP: `style-src 'unsafe-inline'` and broad `img-src`

| Field | Detail |
|--------|--------|
| **The Flaw** | CSP allows inline styles (and dev allows `unsafe-eval` for scripts). `img-src` includes `data:` and `blob:`. |
| **Location** | `lib/constants/security-hosts.ts` (`buildContentSecurityPolicy`) |
| **Risk Level** | **Low**–**Medium** |
| **The Why** | Inline styles weaken XSS blast-radius reduction; `data:` images can carry payloads in some legacy contexts. |
| **Recommendation** | Prefer hashed nonces or move critical styles to external sheets where feasible; restrict `data:`/`blob:` if not required. Production script policy already uses nonce + `strict-dynamic` (good). |

### 1.7 SQL / injection surface

| Field | Detail |
|--------|--------|
| **The Flaw** | None identified as classic injection. Drizzle query builders and `sql` template parameters are used; `sql.raw` in `db/schema.ts` is fixed DDL for generated columns; `lib/product-search.ts` sanitizes tokens before use in `to_tsquery`. |
| **Location** | `db/schema.ts`, `lib/product-search.ts`, action layers using Drizzle. |
| **Risk Level** | **Low** (maintain discipline on any future `sql.raw` with user input) |
| **The Why** | ORM misuse is a common regression path. |
| **Recommendation** | Keep a lint/review rule: no `sql.raw` with interpolated user strings; prefer `sql.placeholder` patterns where applicable. |

---

## 2. Development Practices & Code Quality

### 2.1 Inconsistent admin authorization primitives

| Field | Detail |
|--------|--------|
| **The Flaw** | Some paths use `requireAdmin` / `requireAdminAction`; others inline `sessionClaims?.metadata?.role !== "admin"` with `redirect` or `{ ok: false }`. |
| **Location** | e.g. `actions/categories.ts`, `actions/landing.ts`, `actions/getAuditLogs.ts`, `actions/adminNotifications.ts` vs `lib/security.ts` helpers. |
| **Risk Level** | **Low** (maintainability / consistency) |
| **The Why** | New endpoints may copy the wrong pattern and skip audit logging or standardized error shapes. |
| **Recommendation** | Standardize on `requireAdmin` / `requireAdminAction` everywhere; optionally wrap “return Forbidden JSON” in one helper for read-only admin APIs. |

### 2.2 TypeScript strictness

| Field | Detail |
|--------|--------|
| **The Flaw** | `tsconfig.json` has `"strict": true`. Workspace rules discourage `any`. No widespread `any` in application source (generated `.next` types excluded). |
| **Location** | `tsconfig.json`; grep across `*.ts` / `*.tsx`. |
| **Risk Level** | **Low** (positive finding) |
| **The Why** | Strong typing reduces entire classes of auth/data bugs. |
| **Recommendation** | Enable `noUncheckedIndexedAccess` if team tolerance allows, for stricter null handling on arrays/records. |

### 2.3 Error handling and logging

| Field | Detail |
|--------|--------|
| **The Flaw** | Some catches log only to `console` (e.g. R2 upload in `lib/uploadImages.ts`); others use `logger`. Silent `.catch(() => {})` on middleware’s fire-and-forget audit fetch. |
| **Location** | `lib/uploadImages.ts`; `middleware.ts` (audit `fetch`). |
| **Risk Level** | **Low** |
| **The Why** | Inconsistent observability slows incident response; dropped audit submissions reduce forensic value. |
| **Recommendation** | Route upload errors through `lib/logger.ts`; consider retry or queue for failed internal audit posts. |

---

## 3. Performance & Scalability

### 3.1 Shop listing query pattern

| Field | Detail |
|--------|--------|
| **The Flaw** | None significant: shop page loads products then batches variants and colors by product IDs (`Promise.all` + `inArray`). Home discover uses `leftJoinLateral` for first image. |
| **Location** | `app/[storeType]/shop/page.tsx`; `actions/storefront-products.ts` |
| **Risk Level** | **Low** (positive) |
| **The Why** | Avoids N+1 per product for listing data. |
| **Recommendation** | For very large catalogs, add cursor pagination and cap `inArray` batch sizes if IDs grow beyond comfortable Postgres parameter limits. |

### 3.2 Server Actions body size

| Field | Detail |
|--------|--------|
| **The Flaw** | `next.config.ts` sets `serverActions.bodySizeLimit: "4mb"`. Large image uploads may approach limits. |
| **Location** | `next.config.ts` |
| **Risk Level** | **Low** |
| **The Why** | Rejected uploads or DoS via large bodies if limit is too high. |
| **Recommendation** | Align with `MAX_IMAGE_SIZE_BYTES` / video caps in `lib/security.ts`; consider direct-to-R2 presigned uploads for very large assets. |

### 3.3 Asset optimization

| Field | Detail |
|--------|--------|
| **The Flaw** | Storefront components generally use `next/image` with `remotePatterns` driven from env (`lib/constants/security-hosts.ts`). |
| **Location** | Various `components/*.tsx` |
| **Risk Level** | **Low** |
| **The Why** | Unoptimized images hurt LCP and bandwidth. |
| **Recommendation** | Audit any remaining raw `<img>` or external SVGs; set explicit `sizes` on responsive images. |

---

## 4. Usability & UX (Accessibility)

### 4.1 Skip link present; spot-check remaining a11y

| Field | Detail |
|--------|--------|
| **The Flaw** | Root layout includes a “Skip to content” link (`sr-only` + focus styles)—good baseline. Full WCAG audit (contrast, focus order, dialog traps) was not automated in this review. |
| **Location** | `app/layout.tsx` |
| **Risk Level** | **Low** (unknown gaps without axe/Lighthouse pass) |
| **The Why** | Admin tables and modals often accumulate keyboard traps or missing labels. |
| **Recommendation** | Run Lighthouse/axe on `/shop`, `/checkout`, `/admin/products`, and modal-heavy flows; ensure Radix/shadcn triggers have `aria-label` where icon-only. |

### 4.2 Responsive / ultra-wide

| Field | Detail |
|--------|--------|
| **The Flaw** | Not systematically reviewed; Tailwind `container` and flex patterns are used. |
| **Location** | Various pages |
| **Risk Level** | **Low** |
| **The Why** | Wide tables (`ProductsTable`, etc.) may overflow on small screens. |
| **Recommendation** | Verify horizontal scroll or column hiding on admin data tables. |

---

## 5. Privacy & Compliance

### 5.1 Account deletion and “right to be forgotten”

| Field | Detail |
|--------|--------|
| **The Flaw** | `deleteAccount` removes wishlists, anonymizes order PII for that user’s orders, and deletes the Clerk user. Residual identifiers may remain in `audit_logs`, backups, or email provider logs. |
| **Location** | `actions/deleteAccount.ts`; `lib/audit` usage |
| **Risk Level** | **Medium** (compliance completeness) |
| **The Why** | GDPR/CCPA expectations often include logs and third-party processors. |
| **Recommendation** | Document retention for `audit_logs` (existing cleanup UI noted in repo); extend deletion to anonymize audit rows for that `userId` where legal basis allows; align Resend (and any future analytics) deletion policies. |

### 5.2 Admin contact export

| Field | Detail |
|--------|--------|
| **The Flaw** | `getContactExport` aggregates guest emails and phone numbers from all orders—appropriate for admin-only use but high sensitivity. |
| **Location** | `actions/getContactExport.ts` |
| **Risk Level** | **Medium** (privacy / insider threat) |
| **The Why** | Bulk PII export increases impact of a compromised admin session. |
| **Recommendation** | Audit-log every export; optional step-up auth or export delay; minimize fields exported. |

### 5.3 Cookies (Clerk)

| Field | Detail |
|--------|--------|
| **The Flaw** | Session cookies are managed by Clerk (typically `HttpOnly`, `Secure` in production, `SameSite` appropriate for OAuth). No custom first-party auth cookies reviewed. |
| **Location** | Clerk integration |
| **Risk Level** | **Low** |
| **The Why** | Mis-set cookies enable session theft. |
| **Recommendation** | Confirm production Clerk dashboard cookie settings and subdomain alignment with `NEXT_PUBLIC_*` URLs. |

---

## 6. Overall Architecture

### 6.1 Tech stack alignment

| Field | Detail |
|--------|--------|
| **The Flaw** | Stack (Next 15, Drizzle, Clerk, Supabase storage patterns, optional Upstash, R2 via S3 API) is coherent. Centralized CSP/image allowlists in `security-hosts.ts` reduce drift. |
| **Location** | Cross-cutting |
| **Risk Level** | **Low** (positive) |
| **The Why** | Good separation reduces security mistakes. |
| **Recommendation** | Keep secrets server-only (`R2_*`, `DATABASE_URL`, `INTERNAL_AUDIT_SECRET`); continue documenting in `.env.example` without values. |

### 6.2 Single points of failure

| Field | Detail |
|--------|--------|
| **The Flaw** | Primary Postgres + Clerk are hard dependencies; Redis optional but relied on for abuse prevention when set. R2 misconfiguration blocks uploads with user-visible errors. |
| **Location** | `db/index` pattern; `lib/uploadImages.ts`; `lib/rate-limit.ts` |
| **Risk Level** | **Medium** (operational) |
| **The Why** | Outages take down checkout or admin content workflows. |
| **Recommendation** | Health checks, status page, and graceful degradation messaging; multi-AZ for DB per Supabase plan. |

### 6.3 Minimal public API surface

| Field | Detail |
|--------|--------|
| **The Flaw** | Few Route Handlers (`app/api/audit/sign-in-failure`, `app/api/internal/security-audit`), reducing CORS and anonymous API exposure. Most logic is Server Actions + RSC. |
| **Location** | `app/api/**` |
| **Risk Level** | **Low** (positive) |
| **The Why** | Smaller attack surface. |
| **Recommendation** | When adding APIs, enforce auth, Zod validation, and rate limits by default. |

---

## Positive controls (summary)

- **Broken access control mitigation:** Middleware + `app/admin/layout.tsx` `requireAdmin()` + server action checks for mutations.  
- **Input validation:** Zod on orders, promos, registration-from-order, internal audit body.  
- **XSS:** React text rendering for product descriptions; `escapeHtml` / `validateHref` utilities in `lib/security.ts`.  
- **Headers:** `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production (`next.config.ts`).  
- **CSP + Clerk nonce:** `middleware.ts` + `app/layout.tsx` passing `nonce` to `ClerkProvider`.  
- **Order placement:** `placeOrder` binds `userId` only when `claimedUserId === sessionUserId` (`actions/placeOrder.ts`).  
- **No bundled third-party analytics:** PostHog removed; fewer scripts and no analytics `connect-src` allowance.

---

## Suggested priority order

1. **High:** Remove activation secrets from URLs (tokens in query strings remain the main high-priority privacy/auth-flow risk).  
2. **Medium:** Clarify fail-open rate limiting for production; extend account deletion to audit/third-party retention story.  
3. **Low:** Unify admin auth helpers; tighten internal audit route abuse; CSP/style hardening as incremental work.

---

*This document is an architectural review based on static analysis; dynamic penetration testing and dependency scanning (e.g. `npm audit`) should complement it.*
