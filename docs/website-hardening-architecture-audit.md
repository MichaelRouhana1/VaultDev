# Website Hardening & Architecture Audit

**Role framing:** Senior full-stack engineer and cybersecurity reviewer (Next.js, TypeScript, OWASP Top 10).  
**Scope:** Static analysis of this repository—`package.json`, `middleware.ts`, `next.config.ts`, `db/schema.ts`, security utilities, public API routes, representative server actions, CSP/image configuration, and storefront/admin patterns.  
**Stack:** Next.js 15 (App Router), React 19, Tailwind v4, Drizzle ORM, Clerk, Supabase/R2, optional Upstash Redis.  
**Date:** 2026-03-24  

**Methodology:** Directory and dependency review first, then middleware, headers, auth gates, rate limiting, database access patterns, and a targeted search for `dangerouslySetInnerHTML`, `sql.raw`, broad `any` usage, and explicit CORS configuration. Dynamic penetration testing, dependency CVE scanning (`npm audit`), and automated accessibility runs are **out of scope** but recommended as follow-up.

---

## Executive summary

The project applies several strong controls aligned with OWASP: Clerk for authentication, Drizzle for parameterized queries, Zod on API bodies and critical actions, defense-in-depth admin checks (`middleware.ts` + `requireAdmin` / `requireAdminAction` in `lib/security.ts`), CSP nonces forwarded to `ClerkProvider`, security headers in `next.config.ts`, HttpOnly activation cookies after email handoff, and a small public API surface.

**Main residual risks:** (1) **operational** dependence on correct Clerk JWT / `publicMetadata.role` mapping for admin; (2) **distributed rate limiting** when Upstash is absent or when falling back to in-memory windows (limits are per instance / Edge isolate, not global); (3) **unauthenticated** `POST /api/audit/sign-in-failure` allowing audit-log pollution within rate limits; (4) **IP-based** limits and audits trusting `x-forwarded-for` / `x-real-ip` without an explicit trusted-proxy configuration in app code.

---

## 1. Security & Privacy

### 1.1 Admin authorization depends on Clerk session claims shape

- **The Flaw:** Admin access is granted when `sessionClaims?.metadata?.role === "admin"`. This is correct only if the Clerk JWT/session template exposes `publicMetadata` (or equivalent) into `metadata` on the token the app reads.
- **Location:** `middleware.ts` (admin branch after `auth.protect()`); `lib/security.ts` (`checkAdminSession`, `requireAdmin`, `requireAdminAction`).
- **Risk Level:** Medium (operational); **Critical** if production Clerk settings omit or mis-map the role claim.
- **The Why:** OWASP A01:2021 Broken Access Control—misconfiguration can lock out all admins or accidentally elevate the wrong users.
- **Recommendation:** Treat Clerk configuration as infrastructure-as-code: document required settings (`docs/clerk-roles.md`), verify claims in staging (decode JWT or use Clerk dashboard), and keep server-side gates on every mutating admin path.

### 1.2 Distributed rate limits and Redis fallbacks are not globally consistent

- **The Flaw:** When Upstash env vars are unset or Redis errors occur, limits fall back to in-memory sliding windows (`MemorySlidingWindow` in `lib/rate-limit.ts`; admin path in `middleware.ts`). Each server instance or Edge isolate maintains its own counters, so abuse budgets do not aggregate horizontally.
- **Location:** `lib/rate-limit.ts` (`checkRateLimit`, Redis `catch` branches using `memoryDefaultDegraded` / memory windows); `middleware.ts` (`adminMemoryLimiter`, `globalAdminLimiter` error path).
- **Risk Level:** Medium in multi-instance production without WAF or edge limits.
- **The Why:** An attacker can spread traffic across IPs **and** effectively multiply allowance across replicas, weakening abuse protection compared to shared Redis.
- **Recommendation:** Keep Upstash (or another shared store) in production; add platform WAF / edge rate limits; document expected behavior when Redis is down (stricter per-instance caps help but do not replace a shared limiter).

### 1.3 Unauthenticated client can append audit rows via sign-in failure endpoint

- **The Flaw:** `POST /api/audit/sign-in-failure` accepts JSON from any client without authentication. It is rate-limited per IP but still allows unprivileged callers to create `FAILED_LOGIN` audit rows and consume DB/IO within those limits.
- **Location:** `app/api/audit/sign-in-failure/route.ts`.
- **Risk Level:** Low to Medium (integrity / availability of audit trail; log pollution).
- **The Why:** Attackers or buggy clients could flood partial audit noise, complicating forensics or increasing storage costs.
- **Recommendation:** Require a short-lived signed token or same-origin proof if the route must stay public; alternatively restrict to known Clerk failure callbacks or cap per-IP more aggressively; ensure monitoring alerts on volume spikes.

### 1.4 Client IP for rate limiting and audits trusts forwarded headers

- **The Flaw:** IP addresses are taken from `x-forwarded-for` (first hop) or `x-real-ip` in middleware, server actions, and API routes. If the deployment is not behind a trusted proxy that strips/forges these headers, clients can spoof IPs and evade or skew per-IP limits and audit `ipAddress` fields.
- **Location:** e.g. `middleware.ts`; `app/api/audit/sign-in-failure/route.ts`; `actions/placeOrder.ts`; `app/api/internal/security-audit/route.ts`.
- **Risk Level:** Low on typical managed hosts (e.g. Vercel) that set headers correctly; **Medium** if the app is exposed directly or behind a misconfigured proxy.
- **The Why:** Rate limits and security audits become unreliable; worst case, targeted bypass of throttles.
- **Recommendation:** Use the platform’s documented client IP (e.g. `vercel-ip-country` / `x-vercel-forwarded-for` where applicable) or configure Next.js `trustHostHeader` / deployment docs; validate architecture in runbooks.

### 1.5 Internal audit ingestion secret compared with non–timing-safe equality

- **The Flaw:** `POST /api/internal/security-audit` rejects requests when `headerSecret !== secret` (`lib/internal-api-secret.ts` consumed in route). For cryptographic secrets, `===` can theoretically leak length or enable timing analysis; mitigations here include per-IP rate limiting before the check and use of long random secrets.
- **Location:** `app/api/internal/security-audit/route.ts`; `lib/internal-api-secret.ts`.
- **Risk Level:** Low (especially with rate limits and high-entropy secrets).
- **The Why:** Theoretical secret-guessing aid; unlikely in practice for this endpoint but contrary to defense-in-depth crypto hygiene.
- **Recommendation:** Use `crypto.timingSafeEqual` on equal-length buffers (after normalizing encoding) for the shared secret comparison.

### 1.6 Content Security Policy allows inline styles and broad image sources

- **The Flaw:** `style-src` includes `'unsafe-inline'` (documented as required for Next/Tailwind/Clerk inline styles). `img-src` includes `blob:` plus Supabase/R2/Clerk/Pexels hosts. Dev `script-src` includes `'unsafe-eval'` for tooling.
- **Location:** `lib/constants/security-hosts.ts` (`buildContentSecurityPolicy`).
- **Risk Level:** Low to Medium (XSS blast-radius reduction is weaker for styles; dev eval widens script surface locally only).
- **The Why:** If a script injection ever occurred, inline styles slightly increase attacker flexibility; `blob:` is needed for admin image preview per code comments.
- **Recommendation:** Keep production script policy (nonce + `strict-dynamic`) as-is; periodically reassess whether `data:` or extra hosts are needed; avoid broadening `connect-src` without review.

### 1.7 SQL injection surface

- **The Flaw:** No classic SQL injection identified. Drizzle query builders parameterize values; `sql.raw` in `db/schema.ts` is fixed DDL for a generated `tsvector` column; `lib/product-search.ts` uses `sql.raw("search_vector")` only for the column identifier and passes the search string as a bound parameter to `to_tsquery`.
- **Location:** `db/schema.ts`; `lib/product-search.ts`; server actions using Drizzle.
- **Risk Level:** Low (positive finding, with regression risk).
- **The Why:** Future `sql.raw` with string-concatenated user input would reintroduce injection.
- **Recommendation:** Code review rule: never interpolate user input into `sql.raw`; prefer placeholders and typed builders.

### 1.8 Cross-site scripting (XSS) in user-visible content

- **The Flaw:** Product descriptions are rendered as React text nodes (e.g. `{product.description}` in `components/ProductDetailClient.tsx`), which escapes HTML by default—good. Utilities `escapeHtml` and `validateHref` exist in `lib/security.ts` for other contexts.
- **Location:** Storefront product UI; `lib/security.ts`.
- **Risk Level:** Low absent `dangerouslySetInnerHTML` (none found in app source beyond build artifacts).
- **The Why:** Stored XSS via description would require bypassing React’s default escaping.
- **Recommendation:** For any future rich HTML descriptions, sanitize with a vetted library and CSP-compatible approach.

### 1.9 CORS and public API exposure

- **The Flaw:** No application-wide `Access-Control-*` middleware was found; default same-origin behavior for App Router applies to most flows. Few Route Handlers (`app/api/**`) reduce anonymous HTTP surface.
- **Location:** `app/api/**` (grep for CORS returned no matches).
- **Risk Level:** Low (positive).
- **The Why:** Unnecessary open CORS enlarges CSRF and data-exfiltration options for browser clients.
- **Recommendation:** When adding APIs, default to same-origin; if cross-origin is required, specify explicit origins, methods, and credentials policy.

### 1.10 Sensitive configuration and client bundle exposure

- **The Flaw:** `.env.example` lists only appropriate `NEXT_PUBLIC_*` keys for URLs and Clerk publishable key; secrets (`CLERK_SECRET_KEY`, `DATABASE_URL`, `R2_*`, `INTERNAL_API_SECRET`, etc.) are server-side names—good discipline. `NEXT_PUBLIC_*` values are expected in the client bundle by design.
- **Location:** `.env.example`; Clerk/Supabase usage patterns.
- **Risk Level:** Low if team avoids prefixing secrets with `NEXT_PUBLIC_`.
- **The Why:** Accidental exposure of server keys in client code is a common high-impact mistake.
- **Recommendation:** CI check or grep gate for `NEXT_PUBLIC_` on new env vars; never log secrets (see `AGENTS.md`).

### 1.11 Guest activation: email link still carries token in query (one hop)

- **The Flaw:** Email links hit `GET /api/auth/verify?token=&orderId=`; valid responses set HttpOnly cookies and redirect to a clean URL. Tokens can still appear in Referer logs, email scanners, or browser history for that single request.
- **Location:** `app/api/auth/verify/route.ts`; `lib/order-activation-cookies.ts`.
- **Risk Level:** Low (short-lived, validated, then cookie-based).
- **The Why:** Query-string tokens are a common leak vector; here exposure is limited to the handoff request.
- **Recommendation:** Keep TTL short (already 24h cookie max-age aligned with DB); monitor `state=` redirects; consider POST-based activation only if product requirements allow.

---

## 2. Development Practices & Code Quality

### 2.1 TypeScript strict mode without `noUncheckedIndexedAccess`

- **The Flaw:** `tsconfig.json` sets `"strict": true`. Application source avoids pervasive `any` (grep shows `any` only under `.next` generated types).
- **Location:** `tsconfig.json`; project `*.ts` / `*.tsx`.
- **Risk Level:** Low.
- **The Why:** Stricter indexed access catches a class of undefined-access bugs.
- **Recommendation:** Optionally enable `noUncheckedIndexedAccess` if the team can absorb the churn.

### 2.2 Inconsistent observability for errors

- **The Flaw:** Some paths use `console.error` or silent `.catch(() => {})` (e.g. fire-and-forget internal audit `fetch` in `middleware.ts`), while others use structured logging (`lib/logger.ts`, `loggerWarnStructured`).
- **Location:** `middleware.ts` (audit fetch); `lib/rate-limit.ts` (console on Redis errors); compare to `lib/logger.ts` usage elsewhere.
- **Risk Level:** Low.
- **The Why:** Incidents are harder to diagnose; dropped audit posts reduce forensic value.
- **Recommendation:** Route errors through one logger; add retry or queue for critical audit failures where appropriate.

### 2.3 Server action validation and thrown errors

- **The Flaw:** `placeOrder` throws on Zod aggregate failure after logging (`throw new Error(message)`), which may surface as a generic error boundary depending on client handling; successful path uses structured return types.
- **Location:** `actions/placeOrder.ts`.
- **Risk Level:** Low (UX / error clarity).
- **The Why:** Throwing can be correct for Server Actions but should be consistent with how the checkout UI maps errors.
- **Recommendation:** Prefer `{ success: false, error: string }` for all validation failures if the UI expects uniform JSON-style results.

### 2.4 Maintainability: large client components

- **The Flaw:** Some storefront components (e.g. product detail) are large single files mixing layout, state, and API concerns—manageable but harder to test and review.
- **Location:** `components/ProductDetailClient.tsx` (hundreds of lines).
- **Risk Level:** Low.
- **The Why:** Regressions and security reviews take longer; prop drilling risk increases.
- **Recommendation:** Extract hooks (wishlist, variant selection) and presentational subcomponents without changing behavior.

---

## 3. Performance & Scalability

### 3.1 Shop listing and related data loading

- **The Flaw:** No major N+1 pattern identified in reviewed flows: listings batch variants/colors by product id where applicable (per prior architecture notes in `app/[storeType]/shop` / storefront actions).
- **Location:** Storefront shop and product pages; `actions/storefront-products.ts` (if present in tree).
- **Risk Level:** Low (positive).
- **The Why:** N+1 queries degrade latency and database CPU at scale.
- **Recommendation:** For very large catalogs, add cursor pagination and cap `inArray` batch sizes for Postgres parameter limits.

### 3.2 Database indexes for hot paths

- **The Flaw:** `db/schema.ts` defines targeted indexes (e.g. `products_store_type_visible_idx`, `products_category_slug_idx`, GIN on `search_vector`, category indexes)—appropriate for filter/list/search paths.
- **Location:** `db/schema.ts`.
- **Risk Level:** Low (positive).
- **The Why:** Missing indexes cause full scans as data grows.
- **Recommendation:** Revisit after major query additions; optional SQL in `drizzle/0011_p4_storefront_indexes.sql` per `AGENTS.md` if not yet applied in your environment.

### 3.3 Server Actions body size vs upload limits

- **The Flaw:** `next.config.ts` sets `serverActions.bodySizeLimit: "4mb"` while `MAX_IMAGE_SIZE_BYTES` in `lib/security.ts` allows 5MB images—potential mismatch for actions that post multipart bodies near the limit.
- **Location:** `next.config.ts`; `lib/security.ts`.
- **Risk Level:** Low.
- **The Why:** Users may see failed uploads or confusing errors.
- **Recommendation:** Align limits or move large uploads to presigned direct-to-R2 flows.

### 3.4 Images and third-party assets

- **The Flaw:** `next/image` remote patterns are centralized in `getImageRemotePatterns()` (`lib/constants/security-hosts.ts`), which is a good pattern. Some components use responsive `sizes`; not every `Image` was audited.
- **Location:** `next.config.ts`; various components.
- **Risk Level:** Low.
- **The Why:** Unoptimized images hurt LCP and bandwidth.
- **Recommendation:** Audit remaining `Image` usages for explicit `sizes` and priority on LCP candidates.

---

## 4. Usability & UX (Accessibility)

### 4.1 Skip link and baseline structure

- **The Flaw:** Root layout provides a “Skip to content” link with focus styles and `#main-content` target—good baseline. Full WCAG 2.x compliance was not validated with automated tools in this pass.
- **Location:** `app/layout.tsx`.
- **Risk Level:** Low (unknown gaps without axe/Lighthouse).
- **The Why:** Admin tables, dialogs, and checkout flows often accumulate keyboard and screen-reader issues.
- **Recommendation:** Run axe or Lighthouse on `/checkout`, `/admin/products`, and modal-heavy flows; ensure icon-only controls retain `aria-label` (some wishlist buttons already do in `ProductCard.tsx`).

### 4.2 Product description inside `alt` text

- **The Flaw:** `ProductCard` and `ProductDiscovery` use `product.description` inside `Image` `alt` when present, which can produce overly long or noisy alternative text for screen readers.
- **Location:** `components/ProductCard.tsx`; `components/storefront/ProductDiscovery.tsx`.
- **Risk Level:** Low (a11y quality, not security).
- **The Why:** WCAG recommends concise, meaningful alt text; embedding full marketing copy is usually inappropriate.
- **Recommendation:** Use `alt={product.name}` or a short curated summary field.

### 4.3 Responsive / ultra-wide layouts

- **The Flaw:** Not systematically tested; Tailwind layout patterns and admin tables may require horizontal scroll on small viewports.
- **Location:** Admin data tables (e.g. `ProductsTable`, `CustomersTable`).
- **Risk Level:** Low.
- **The Why:** Overflow and touch targets affect usability and compliance perceptions.
- **Recommendation:** Manual pass on 320px and ultra-wide; add `overflow-x-auto` wrappers where missing.

---

## 5. Privacy & Compliance

### 5.1 Activation cookies

- **The Flaw:** Activation cookies use `httpOnly: true`, `sameSite: "lax"`, `secure` in production, and path `/`—aligned with common best practices for session-adjacent cookies.
- **Location:** `lib/order-activation-cookies.ts`.
- **Risk Level:** Low (positive).
- **The Why:** Missing `HttpOnly` or loose `SameSite` increases session fixation and theft risk.
- **Recommendation:** Confirm production is always `NODE_ENV=production` on the edge; document cross-subdomain needs if any.

### 5.2 Clerk session cookies

- **The Flaw:** Primary auth cookies are managed by Clerk (typically `HttpOnly`, `Secure` in production, appropriate `SameSite`). No custom first-party auth cookie implementation was reviewed in depth.
- **Location:** Clerk integration; `ClerkProvider` in `app/layout.tsx`.
- **Risk Level:** Low (depends on Clerk dashboard and domain alignment).
- **The Why:** Mis-set cookies enable token theft.
- **Recommendation:** Verify Clerk production instance settings and alignment with `NEXT_PUBLIC_CLERK_*` URLs (`AGENTS.md`).

### 5.3 Account deletion and data minimization

- **The Flaw:** `deleteAccount` (reviewed in prior iterations) performs transactional redaction/anonymization for linked DB records and Clerk user deletion; backups, email provider retention, and third-party processors remain out of band.
- **Location:** `actions/deleteAccount.ts`.
- **Risk Level:** Low for in-app DB scope; Medium until subprocessors are documented.
- **The Why:** GDPR-style “right to erasure” spans vendors and backups.
- **Recommendation:** Document Resend/email retention and backup rotation; extend audit logging if missing for deletion events.

### 5.4 Admin bulk contact export

- **The Flaw:** `getContactExport` returns deduplicated guest emails and phone numbers from all orders. Access is gated with `requireAdminAction` and an audit log entry (`contact.export`).
- **Location:** `actions/getContactExport.ts`.
- **Risk Level:** Medium (insider threat / high-value PII aggregation).
- **The Why:** A compromised admin session exfiltrates the entire customer contact set at once.
- **Recommendation:** Step-up authentication, export approval workflow, or field minimization; alert on export actions.

---

## 6. Overall Architecture

### 6.1 Tech stack alignment

- **The Flaw:** None significant—Drizzle + Zod + Clerk + optional Upstash + R2/S3 pattern fits e-commerce and keeps secrets server-side when naming conventions are followed.
- **Location:** Cross-cutting.
- **Risk Level:** Low (positive).
- **The Why:** Coherent boundaries reduce accidental exposure.
- **Recommendation:** Keep CSP and image allowlists centralized in `lib/constants/security-hosts.ts` (already done).

### 6.2 Single points of failure

- **The Flaw:** Postgres and Clerk are hard runtime dependencies; optional Redis improves rate limiting but memory fallback changes guarantees; R2 misconfiguration blocks uploads.
- **Location:** `db/index.ts` usage; `lib/uploadImages.ts`; `lib/rate-limit.ts`.
- **Risk Level:** Medium (operational).
- **The Why:** Outages block checkout or admin content workflows.
- **Recommendation:** Health checks, status communication, and multi-AZ database per provider guidance.

### 6.3 Site-wide HTTP Basic Auth option

- **The Flaw:** When `REQUIRE_SITE_PASSWORD=true`, middleware enforces Basic auth on matched routes, with an exception for `POST /api/internal/security-audit` when `x-mosaik-internal-secret` matches. Misconfiguration (empty user/password) denies all traffic and logs a warning.
- **Location:** `middleware.ts` (`verifySiteBasicAuth`, `shouldSkipSiteBasicAuth`).
- **Risk Level:** Low (preview/staging feature); lockout is fail-closed if creds missing.
- **The Why:** Basic auth over HTTP or leaked creds exposes the whole preview.
- **Recommendation:** Use only over HTTPS; rotate preview credentials; understand `/_next` static assets are included in the matcher (by design for gating).

### 6.4 Order placement identity binding

- **The Flaw:** Positive control: `placeOrder` sets `userId` only when `claimedUserId === sessionUserId` from Clerk, preventing trivial client-side impersonation of another user’s account on orders.
- **Location:** `actions/placeOrder.ts`.
- **Risk Level:** N/A (mitigation).
- **The Why:** Without this check, guests could attach orders to arbitrary user IDs.
- **Recommendation:** Preserve this invariant in any checkout refactor.

---

## Positive controls (summary)

- **Access control:** Middleware admin role check + `requireAdmin` / `requireAdminAction` for server mutations and sensitive reads.  
- **Input validation:** Zod on orders, promos, internal audit ingestion, auth verify query params.  
- **Headers:** `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production (`next.config.ts`).  
- **CSP + nonce:** `middleware.ts` sets CSP and `x-nonce`; `app/layout.tsx` passes `nonce` to `ClerkProvider`.  
- **Rate limiting:** Upstash when configured; stricter in-memory fallback on Redis errors in `lib/rate-limit.ts`; admin throughput limits in middleware.  
- **Internal audit route:** Per-IP limits before secret check; shared secret header (`x-mosaik-internal-secret`).  
- **Analytics:** No third-party analytics SDK found in current dependencies—reduced third-party data sharing surface.  

---

## Suggested priority order

1. **High / operational:** Validate Clerk JWT / `metadata.role` mapping in every deployed environment.  
2. **Medium:** Ensure production uses shared Redis (or WAF limits) so rate limits are not purely per-instance; monitor audit volume on `sign-in-failure`.  
3. **Low:** Timing-safe secret compare for internal audit; tighten product image `alt` text; align Server Action body limit with max upload size; optional `noUncheckedIndexedAccess`.  

---

*This document is based on static analysis of the repository state as of the date above. It does not replace penetration testing, dependency vulnerability scanning, or formal compliance assessments.*
