# Website Hardening & Architecture Audit

**Scope:** Next.js 15 (App Router), React 19, Drizzle ORM, Clerk, Supabase/R2, Upstash Redis (optional).  
**Method:** Review of `package.json`, `middleware.ts`, `next.config.ts`, `db/schema.ts`, security utilities, API routes, critical server actions, and representative storefront/admin flows.  
**Date:** 2025-03-23  
**Update:** 2025-03-23 — PostHog removed; activation cookies; internal audit header `x-mosaik-internal-secret`; account deletion + audit redaction; centralized `requireAdmin` / `requireAdminAction`.

## Executive summary

The codebase shows deliberate OWASP-oriented choices: Clerk for auth, Drizzle for parameterized queries, Zod on several boundaries, CSP with nonces wired into `ClerkProvider`, security headers in `next.config.ts`, admin gating in middleware plus server actions/layout, and optional Redis-backed rate limiting. The strongest **remaining** operational risk is **fail-open rate limiting** when Redis is down or unset. Configuration risks (Clerk JWT admin claims) remain a process concern.

**[RESOLVED: PostHog Analytics has been completely removed from the codebase, eliminating the third-party data leak vector that previously could have captured full URLs (including activation query parameters) in analytics.]**

**[RESOLVED: Guest activation tokens on `/checkout/success` and `/activate-account` are carried in HttpOnly cookies after checkout or the email verify hop; see `lib/order-activation-cookies.ts` and `/api/auth/verify`.]**

---

## 1. Security & Privacy

### 1.1 ~~Activation token exposed in query string~~ — **RESOLVED** (checkout / activate pages)

| Field | Detail |
|--------|--------|
| **Status** | HttpOnly cookies (`mosaik_activation_token`, `mosaik_activation_order_id`) plus `/api/auth/verify` email handoff. |
| **Prior risk** | Tokens in `?key=` / `?token=` on success and activate pages. |
| **Risk Level** | **N/A** (mitigated for in-app flows; email still uses a one-click URL to `/api/auth/verify` only) |

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

### 1.4 ~~Internal audit ingestion~~ — **RESOLVED** (secret header); optional rate limit still open

| Field | Detail |
|--------|--------|
| **Status** | **[RESOLVED]** for anonymous abuse: `POST /api/internal/security-audit` returns **401** unless header **`x-mosaik-internal-secret`** matches **`INTERNAL_API_SECRET`** (legacy: **`INTERNAL_AUDIT_SECRET`** if unset). Middleware and `lib/internal-security-audit-ingest.ts` send this header (`lib/internal-api-secret.ts`). |
| **Remaining (optional)** | Per-IP / global rate limit on the route still recommended if the secret were ever leaked. |
| **Location** | `app/api/internal/security-audit/route.ts`; `lib/internal-security-audit-ingest.ts`; `middleware.ts` |
| **Prior risk** | Unguarded endpoint allowed DB spam. |
| **Risk Level** | **Low** with secret enforced; **Medium** if secret leaks (mitigate with rotation + rate limits). |

### 1.5 Admin role depends on Clerk JWT / session claims configuration

| Field | Detail |
|--------|--------|
| **The Flaw** | Admin checks use `sessionClaims?.metadata?.role === "admin"` (middleware and `lib/security.ts`). If the Clerk JWT template omits `metadata`, no one is admin; if mis-mapped, privilege escalation is possible. |
| **Location** | `middleware.ts`; `lib/security.ts` (`checkAdminSession`); app code should use `requireAdmin` / `requireAdminAction` only. |
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

### 2.1 ~~Inconsistent admin authorization primitives~~ — **RESOLVED**

| Field | Detail |
|--------|--------|
| **Status** | **[RESOLVED]** Admin server actions and RSC admin pages use **`requireAdmin()`** (redirect) or **`requireAdminAction()`** (JSON + optional `auth.failed_admin` audit) from `lib/security.ts`. Middleware retains the direct `sessionClaims` check (Edge-appropriate). |
| **Prior locations** | e.g. `actions/categories.ts`, `actions/landing.ts`, `actions/promo.ts`, `actions/getAuditLogs.ts`, `app/admin/*/page.tsx`. |
| **Risk Level** | **N/A** (consistency issue addressed) |

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

### 5.1 ~~Account deletion and “right to be forgotten” (audit_logs)~~ — **RESOLVED** (in-app DB scope)

| Field | Detail |
|--------|--------|
| **Status** | **[RESOLVED]** for `audit_logs`: `deleteAccount` runs in a **transaction** that anonymizes rows where `user_id` matches the Clerk user, merges a `subjectPiiRedacted` flag into `details` where `details.target` or `details.email` matches the user, then anonymizes `orders` and deletes the Clerk user. Backups, Resend, and other processors remain out of band. |
| **Location** | `actions/deleteAccount.ts` |
| **Risk Level** | **Low** for DB trail; **Medium** until third-party retention is documented. |
| **Recommendation** | Document Resend/email retention; align backup policies. |

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
| **Recommendation** | Keep secrets server-only (`R2_*`, `DATABASE_URL`, **`INTERNAL_API_SECRET`**); document in `.env.example`. |

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

- **Broken access control mitigation:** Middleware + `app/admin/layout.tsx` `requireAdmin()` + `requireAdmin` / `requireAdminAction` on mutations and sensitive reads.  
- **Input validation:** Zod on orders, promos, registration-from-order, internal audit body.  
- **XSS:** React text rendering for product descriptions; `escapeHtml` / `validateHref` utilities in `lib/security.ts`.  
- **Headers:** `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production (`next.config.ts`).  
- **CSP + Clerk nonce:** `middleware.ts` + `app/layout.tsx` passing `nonce` to `ClerkProvider`.  
- **Order placement:** `placeOrder` binds `userId` only when `claimedUserId === sessionUserId` (`actions/placeOrder.ts`).  
- **No bundled third-party analytics:** PostHog removed; fewer scripts and no analytics `connect-src` allowance.  
- **Internal audit route:** Requires `x-mosaik-internal-secret` + `INTERNAL_API_SECRET` (or legacy env).  
- **Account deletion:** `audit_logs` rows tied to the user are redacted in a transaction.

---

## Suggested priority order

1. **Medium:** Clarify **fail-open rate limiting** for production (Redis down) and add WAF/alternate caps if needed.  
2. **Low:** Optional rate limit on `/api/internal/security-audit` if secret rotation policy is weak; CSP/style hardening; audit-log export of contacts.  
3. **Ongoing:** Clerk JWT / admin role configuration checks in staging.

---

*This document is an architectural review based on static analysis; dynamic penetration testing and dependency scanning (e.g. `npm audit`) should complement it.*
