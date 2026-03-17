# VAULT — Pages & Features

Comprehensive documentation of every route, component, and feature in the VAULT e-commerce application.

---

## Table of Contents

1. [Infrastructure & Global Features](#infrastructure--global-features)
2. [Root Home Page](#root-home-page)
3. [Store Home Page](#store-home-page)
4. [Shop Page](#shop-page)
5. [Product Detail Page](#product-detail-page)
6. [Cart Page](#cart-page)
7. [Checkout Page](#checkout-page)
8. [Checkout Success Page](#checkout-success-page)
9. [Account Page](#account-page)
10. [About Page](#about-page)
11. [Sign In / Sign Up Pages](#sign-in--sign-up-pages)
12. [Admin Dashboard](#admin-dashboard)
13. [Admin Products](#admin-products)
14. [Admin Categories](#admin-categories)
15. [Admin Orders](#admin-orders)
16. [Admin Hero](#admin-hero)
17. [Admin Video](#admin-video)
18. [Admin Lookbook](#admin-lookbook)
19. [Admin Promos](#admin-promos)
20. [Admin Customers](#admin-customers)
21. [Shared Components Reference](#shared-components-reference)
22. [Actions Reference](#actions-reference)
23. [Database Schema Overview](#database-schema-overview)

---

## Infrastructure & Global Features

### Authentication (Clerk)
- **Provider:** `ClerkProvider` in root layout with dynamic loading and CSP nonce.
- **Protected Routes:** `/account` requires sign-in (middleware `auth.protect()`).
- **Admin Routes:** `/admin/*` requires sign-in + `sessionClaims.metadata.role === "admin"`.
- **Redirect:** Unauthorized admin access redirects to `/`.

### Rate Limiting (Upstash Redis)
- **Middleware:** `globalAdminLimiter` — 20 requests / 10s per IP on `/admin/*` and `/api/upload`.
- **Library:** `lib/rate-limit.ts` — `@upstash/ratelimit` with Redis (conditional on `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
- **Place Order:** `checkPlaceOrderLimit(identifier)` — 5 req/10s per user/guest/IP.
- **Validate Promo:** `checkValidatePromoLimit(ip)`.
- **Toggle Wishlist:** `checkToggleWishlistLimit(userId)`.
- **Sensitive Ops:** `checkSensitiveOperationLimit(identifier)` for other admin operations.

### PostHog Analytics
- **Provider:** `PostHogProvider` — initializes when `NEXT_PUBLIC_POSTHOG_KEY` is set.
- **Pageviews:** Manual `$pageview` capture on `pathname` and `searchParams` changes.
- **Events:** `add_to_cart`, `initiate_checkout` (and others where `usePostHog()` is used).

### Content Security Policy (CSP)
- **Middleware:** Sets CSP headers with nonce for scripts; production uses `'strict-dynamic'`, dev adds `'unsafe-eval'`.
- **Nonce:** Passed to Clerk via `headers().get("x-nonce")` in root layout.

### Theme Provider
- **Provider:** `ThemeProvider` (next-themes) for dark/light mode.
- **Persistence:** Via `ThemeProvider`; Navbar exposes theme toggle.

### Cart State (CartContext)
- **Storage:** `localStorage` keyed by `vault_cart_${userId ?? "guest"}`.
- **Scope:** Add/remove/update quantity, clear ordered items, total items/price.
- **Drawer:** `CartDrawer` and `ShopDrawer` registered via `setOpenCart`.

### Root Layout
- **File:** `app/layout.tsx`
- **Providers:** ClerkProvider, ThemeProvider, PostHogProvider, CartProvider.
- **UI:** Skip-to-content link, Navbar, main content `#main-content`, Toaster (sonner).

### Global Styling
- **File:** `app/globals.css`
- Contains Tailwind CSS v4 directives (`@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`).
- Theme variable overrides via `@theme inline` and `:root` / `.dark` — VAULT palette (light and dark), radii, sidebar colors.
- Base layer styles for `body`, focus rings, `scrollbar-hide` utility, `hero-progress` animation.
- Imported by the Root Layout for app-wide styles.

---

## Root Home Page

**Route:** `/`  
**File:** `app/page.tsx`  
**Navbar:** Hidden on this page.

### UI Elements
- Split-screen layout: left **Streetwear**, right **Formal**.
- Each half: hero image, overlay, title, "Enter Store" CTA.
- Hover: subtle zoom and overlay transition.

### Logic & Actions
- No server actions. Pure navigation via `<Link href="/streetwear">` and `<Link href="/formal">`.

### State Management
- None. Static layout.

### URL Params
- None.

---

## Store Home Page

**Route:** `/[storeType]` — e.g. `/streetwear`, `/formal`  
**File:** `app/[storeType]/page.tsx`  
**Params:** `storeType` (streetwear | formal)

### UI Elements
- **Hero Carousel** — `HeroCarousel` (or `HeroFallback` when no images).
- **Category Grid** — `CategoryGrid` with home categories and links.
- **Editorial Promotion** — `EditorialPromotion` with home video.
- **Lookbook Section** — `LookbookSection` (conditional on section visibility).
- **Product Discovery** — `ProductDiscovery` (8 products).
- **Newsletter Form** — `NewsletterForm`.
- **Site Footer** — `SiteFooter`.

### Logic & Actions
- **Hero:** `getHeroImages(storeType)` from `actions/hero.ts`.
- **Video:** `getHomeVideo(storeType)` from `actions/video.ts`.
- **Lookbook:** `getLookbookItems(storeType)`, `getLookbookSectionVisible()` from `actions/lookbook.ts`.
- **Categories:** `getCategoriesForHome(storeType)`, `getStoreCategorySlugs(storeType)` from `actions/categories.ts`.
- **Products:** Single query via `leftJoinLateral` (products + first image); `getProductDisplayPrice`, `isProductOnSale`, `getProductDiscountPercent` from `lib/utils`.

### State Management
- Server component. No client state.

### URL Params
- `storeType` — drives all content and links.

---

## Shop Page

**Route:** `/[storeType]/shop` — e.g. `/streetwear/shop`, `/formal/shop`  
**File:** `app/[storeType]/shop/page.tsx`  
**Client:** `ShopClient`

### UI Elements
- **Filter Panel** — `FilterPanel` (price, size, color, subcategory).
- **Utility Bar** — `UtilityBar` (sort, filters toggle).
- **Category Header** — `CategoryHeader` (when `cat` filter applied).
- **Product Grid** — `ProductCard` components with load-more pagination.

### Logic & Actions
- **Products:** `db.select().from(products)` with storeType + category filter.
- **Categories:** `getValidCategorySlugs()`, `getStoreCategorySlugs()`, `getStoreCategories()` from `actions/categories.ts`.
- **Wishlist:** Wishlist product IDs for current user (Clerk `userId`) from `wishlists` table.

### State Management
- **CartContext:** Used by `ProductCard` for add-to-cart.
- **URL Params:** `?cat=<slug>`, `?sort=<option>` drive filtering and sorting.
- **FilterPanel:** Local state for price/size/color/subcategory; client-side filtering.

### Sort Options
- `recommended`, `newest`, `price-low`, `price-high`, `name-asc`, `name-desc`.

---

## Product Detail Page

**Route:** `/[storeType]/product/[id]` — e.g. `/streetwear/product/1`  
**File:** `app/[storeType]/product/[id]/page.tsx`  
**Client:** `ProductDetailClient`

### UI Elements
- Breadcrumb: Home / storeType / category slug.
- **ProductDetailClient:** Image gallery, color picker, size selector, Add to Cart, Add to Wishlist.
- **Similar Products** — product grid (same `categorySlug`).

### Logic & Actions
- **Product:** `db.select().from(products)` by id + storeType.
- **Variants & Colors:** `productVariants`, `productColors` for this product.
- **Similar:** Products with same `categorySlug`, excluding current.
- **Wishlist:** `toggleWishlist(productId)` from `actions/toggleWishlist.ts`.
- **Add to Cart:** `addToCart()` from `CartContext`.

### State Management
- **CartContext:** `addToCart`, `openCart`.
- **Wishlist:** `inWishlist` prop; toggled via `toggleWishlist`.

### URL Params
- `storeType`, `id` (product ID).

---

## Cart Page

**Route:** `/cart`  
**File:** `app/cart/page.tsx`  
**Client:** `CartClient`

### UI Elements
- **Tabs:** "Basket" (cart items) | "Favourites" (wishlist).
- **Basket Tab:** Product grid with image, name, price, size/color, quantity controls (+/−, remove).
- **Order Summary:** Total, free delivery threshold ($100), "Process Order" button.
- **Favourites Tab:** `ProductCard` grid (requires sign-in).

### Logic & Actions
- **Basket:** `useCart()` — `items`, `removeFromCart`, `updateQuantity`, `totalPrice`.
- **Process Order:** Navigates to `/checkout?cart=<JSON>`; PostHog `initiate_checkout`.
- **Wishlist:** Server-fetched from `wishlists` + `products` for signed-in user.

### State Management
- **CartContext:** Full cart state (localStorage-backed).
- **Auth:** `useAuth()` for sign-in gate on Favourites tab.

### URL Params
- None.

---

## Checkout Page

**Route:** `/checkout`  
**File:** `app/checkout/page.tsx`  
**Client:** `CheckoutForm`

### UI Elements
- **Contact & Payment Card:** Full name, email, phone, address, city, payment method (COD | CARD | BANK_TRANSFER).
- **Order Summary Card:** Cart items, promo code input, subtotal/discount/shipping/total.
- **Place Order** button.

### Logic & Actions
- **Place Order:** `placeOrder()` from `actions/placeOrder.ts` — Zod validation, rate limit, transaction.
- **Validate Promo:** `validatePromoCode(code, subtotal, shippingFee)` from `actions/promo.ts`.
- **Post-Success:** `clearOrderedItems()` from `CartContext`; redirect to `/checkout/success?orderId=...`.

### State Management
- **Cart:** Passed via `?cart=...` (JSON-encoded).
- **CartContext:** `clearOrderedItems` after successful order.
- **Form State:** `useActionState` for place order; local state for promo apply/remove.

### URL Params
- `?cart=<JSON>` — cart items for checkout.

---

## Checkout Success Page

**Route:** `/checkout/success`  
**File:** `app/checkout/success/page.tsx`

### UI Elements
- Heading: "Order confirmed".
- Order ID display (when user owns the order).
- "Continue shopping" button → `/shop`.

### Logic & Actions
- **Verification:** Order ID + Clerk `userId` match for display; `db.select().from(orders)`.

### State Management
- None. Server component.

### URL Params
- `?orderId=<number>`.

---

## Account Page

**Route:** `/account`  
**File:** `app/account/page.tsx`  
**Auth:** Protected; redirects to `/sign-in` if not signed in.

### UI Elements
- **Order History** — List of orders with ID, date, status, total, line items.
- **Wishlist** — `ProductCard` grid for wishlist products.
- **Privacy Settings** — `DeleteAccountButton` for account deletion.

### Logic & Actions
- **Orders:** `db.select().from(orders).where(eq(orders.userId, userId))` + order items.
- **Wishlist:** `wishlists` joined with `products`.
- **Delete Account:** `deleteAccount()` from `actions/deleteAccount.ts` — anonymizes orders, deletes wishlists, deletes Clerk user.

### State Management
- None. Server component.

---

## About Page

**Route:** `/about`  
**File:** `app/about/page.tsx`

### UI Elements
- Centered text: "About VAULT", tagline, "Explore the collection" link.

### Logic & Actions
- None. Static content.

### URL Params
- None.

### Note
- "Explore the collection" links to `/shop`. The app has no `/shop` route; users may need to pick store type from `/` or use Navbar "Search" when in store context.

---

## Sign In / Sign Up Pages

**Routes:** `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`  
**Files:** Clerk catch-all pages (Clerk-provided UI).  
**Navbar:** Hidden on these routes.

---

## Admin Dashboard

**Route:** `/admin`  
**File:** `app/admin/page.tsx`  
**Layout:** `AdminLayout` + `AdminLayoutClient`, `AdminSidebar`, `AdminHeader`.

### UI Elements
- Store type badge: "Managing: streetwear | formal".
- **Stat Cards:** Products (per store), Global Orders, Global Revenue (30D), Global Orders (7D).
- **AnalyticsStatus** — PostHog status indicator.
- **Recent Orders Table:** ID, email, total, date, "View" link.

### Logic & Actions
- **Store Type:** `getAdminStoreType()` from `actions/admin-store.ts`.
- **Stats:** `db` queries for `products`, `orders`, revenue, recent orders.
- **Layout:** `setAdminStoreType()` when switching store (AdminHeader).

### State Management
- Admin store type cookie (`adminStore`) drives product/category scope.

---

## Admin Products

**Routes:** `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`  
**Files:** `app/admin/products/page.tsx`, `app/admin/products/ProductsTable.tsx`, `app/admin/products/StockHoverCell.tsx`, `page.tsx` in new/edit folders.

### UI Elements (List)
- **ProductsTable** (`app/admin/products/ProductsTable.tsx`) — Renders the searchable product list with TanStack Table: name, image thumbnail, category, stock, price (with sale badge), color, visibility status, edit/delete actions. Includes search input, category filter, row selection for bulk discount, "Clear expired sales" button.
- **Inventory Tooltips** (`app/admin/products/StockHoverCell.tsx`) — Hover cell component showing total stock with a popover breakdown by color and size (XS–XL). Used in the ProductsTable stock column.
- Search input (`?q=`), category filter (`?category=`).
- "New Product" link.

### UI Elements (New/Edit)
- **CreateProductForm** / **EditProductForm** — name, description, price, sale price, category, store type, visibility, image uploads.
- **ProductImageUpload**, **ImageCropModal** for images.
- **InventoryManager** for variants (size/color/stock).

### Logic & Actions
- **List:** `getAdminStoreType()`, `db.select().from(products)` with optional search/category filter.
- **Create:** `createProduct(formData)` from `actions/createProduct.ts`.
- **Update:** `updateProduct(formData)` from `actions/updateProduct.ts`.
- **Delete:** `deleteProduct(productId)` from `actions/deleteProduct.ts`.
- **Upload:** `uploadProductImage()` from `actions/uploadProductImage.ts`.
- **Bulk Discount:** `applyBulkDiscount()`, `removeBulkDiscount()` from `actions/bulk-discount.ts`.

### State Management
- Search params `q`, `category`.
- Admin store type for product scope.

---

## Admin Categories

**Route:** `/admin/categories`  
**File:** `app/admin/categories/page.tsx`  
**Client:** `CategoriesAdminClient`

### UI Elements
- **Add Category** form — label, slug, store type, show on home, image upload.
- **Categories Table** — image, label, slug, store type, show on home, edit/delete.
- Inline edit mode for existing categories.

### Logic & Actions
- **Create:** `createCategory(formData)` from `actions/categories.ts`.
- **Update:** `updateCategory(id, formData)`.
- **Delete:** `deleteCategory(id)`.
- **Fetch:** `getCategoriesForHome()`, `getStoreCategorySlugs()`, etc.

### State Management
- Local state for add/edit mode, form values.

---

## Admin Orders

**Routes:** `/admin/orders`, `/admin/orders/[id]`  
**Files:** `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`

### UI Elements (List)
- Orders table (ID, customer, total, status, date, View link).

### UI Elements (Detail)
- **UpdateOrderStatus** — status dropdown, update button.
- Order details, line items.

### Logic & Actions
- **List:** `db.select().from(orders)`.
- **Detail:** `updateOrderStatus(orderId, newStatus)` from `actions/updateOrderStatus.ts`.

### State Management
- Order ID from route params.

---

## Admin Hero

**Route:** `/admin/hero`  
**File:** `app/admin/hero/page.tsx`  
**Client:** `HeroAdminClient`

### UI Elements
- Hero images list with reorder, delete.
- **Add Hero Image** — URL or file upload.
- **ImageCropModal** for cropping.

### Logic & Actions
- **Fetch:** `getHeroImages()`, `getAllHeroImages()` from `actions/hero.ts`.
- **Add:** `addHeroImage()`, `addHeroImageFromFile()`.
- **Delete:** `deleteHeroImage(id)`.

---

## Admin Video

**Route:** `/admin/video`  
**File:** `app/admin/video/page.tsx`  
**Client:** `VideoAdminClient`

### UI Elements
- Current home video display.
- **Add/Replace Video** — file upload.
- **VideoCropModal** for trimming.

### Logic & Actions
- **Fetch:** `getHomeVideo()`, `getHomeVideoForAdmin()` from `actions/video.ts`.
- **Add:** `addHomeVideoFromFile(formData)`.
- **Delete:** `deleteHomeVideo(id)`.

---

## Admin Lookbook

**Route:** `/admin/look`  
**File:** `app/admin/look/page.tsx`  
**Client:** `LookAdminClient`

### UI Elements
- Lookbook items list with edit/delete.
- **Add Lookbook Item** — label, href, image upload.
- Section visibility toggle.

### Logic & Actions
- **Fetch:** `getLookbookItems()`, `getAllLookbookItems()`, `getLookbookSectionVisible()` from `actions/lookbook.ts`.
- **Add:** `addLookbookItemFromFile(formData)`.
- **Update:** `updateLookbookItem(id, ...)`.
- **Delete:** `deleteLookbookItem(id)`.
- **Visibility:** `setLookbookSectionVisible(visible)`.

---

## Admin Promos

**Routes:** `/admin/promos`, `/admin/promos/new`  
**Files:** `app/admin/promos/page.tsx`, `app/admin/promos/new/page.tsx`, `app/admin/promos/PromosTable.tsx`  
**Components:** `PromosTable`, `PromoCodeForm`

### UI Elements
- **PromosTable** — code, discount, min order, max uses, status, toggle, delete.
- **PromoCodeForm** — code, discount type (PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING), value, min order, max uses, expiry.

### Logic & Actions
- **Create:** `createPromoCode(formData)` from `actions/promo.ts`.
- **Toggle:** `togglePromoStatus(id)`.
- **Delete:** `deletePromoCode(id)`.
- **Validate:** `validatePromoCode()` (used at checkout).

---

## Admin Customers

**Routes:** `/admin/customers`, `/admin/customers/[id]`  
**Files:** `app/admin/customers/page.tsx`, `app/admin/customers/[id]/page.tsx`, `app/admin/customers/CustomersTable.tsx`  
**Component:** `CustomersTable`

### UI Elements
- Customers table (from orders: guest email, user id).
- Detail page for customer view.

### Logic & Actions
- **Fetch:** Orders/customers data from `orders` table.

---

## Shared Components Reference

| Component | Purpose |
|-----------|---------|
| `Navbar` | Main nav: logo, Shop drawer, Search, theme toggle, Account, Cart icon. Hidden on `/`, `/admin`, `/sign-in`, `/sign-up`. |
| `CartDrawer` | Slide-out cart from CartContext; quantity controls, "Proceed to Checkout". |
| `ShopDrawer` | Slide-out shop menu with category links. |
| `ProductCard` | Product image, wishlist heart, size overlay, add-to-cart, color swatches. Uses `toggleWishlist`, `addToCart`, PostHog. |
| `HeroCarousel` | Hero image carousel with dots/nav. |
| `HeroFallback` | Fallback hero when no hero images. |
| `CategoryGrid` | Category tiles with links. |
| `EditorialPromotion` | Video section with caption. |
| `LookbookSection` | "Get the Look" style cards. |
| `ProductDiscovery` | Product grid with ProductCards. |
| `NewsletterForm` | Email signup (form submit currently no-op). |
| `SiteFooter` | Footer links and branding. |
| `FilterPanel` | Price range, size, color, subcategory filters. |
| `UtilityBar` | Sort dropdown, filter toggle. |
| `CategoryHeader` | Category label when filtered. |
| `CheckoutForm` | Contact, address, payment, promo, place order. |
| `DeleteAccountButton` | Confirms and calls `deleteAccount()`. |
| `AdminSidebar` | Admin nav links. |
| `AdminHeader` | Store type switcher, user button, menu toggle. |
| `StoreTypeSelect` | Streetwear | Formal | Both dropdown. |

---

## Actions Reference

| Action File | Key Exports |
|-------------|-------------|
| `actions/admin-store.ts` | `setAdminStoreType`, `getAdminStoreType`, `migrateMissingStoreTypes` |
| `actions/categories.ts` | `getValidCategorySlugs`, `getStoreCategorySlugs`, `getStoreCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `getCategoriesForHome` |
| `actions/createProduct.ts` | `createProduct` |
| `actions/updateProduct.ts` | `updateProduct` |
| `actions/deleteProduct.ts` | `deleteProduct` |
| `actions/hero.ts` | `getHeroImages`, `addHeroImage`, `deleteHeroImage`, `addHeroImageFromFile` |
| `actions/video.ts` | `getHomeVideo`, `addHomeVideoFromFile`, `deleteHomeVideo` |
| `actions/lookbook.ts` | `getLookbookItems`, `setLookbookSectionVisible`, `addLookbookItemFromFile`, `updateLookbookItem`, `deleteLookbookItem` |
| `actions/promo.ts` | `validatePromoCode`, `createPromoCode`, `togglePromoStatus`, `deletePromoCode` |
| `actions/placeOrder.ts` | `placeOrder` |
| `actions/toggleWishlist.ts` | `toggleWishlist` |
| `actions/updateOrderStatus.ts` | `updateOrderStatus` |
| `actions/deleteAccount.ts` | `deleteAccount` |
| `actions/bulk-discount.ts` | `applyBulkDiscount`, `removeBulkDiscount`, `clearExpiredSales` |
| `actions/uploadProductImage.ts` | `uploadProductImage` |
| `actions/seed-categories.ts` | `seedRootCategories` |

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `productCategories` | Admin-managed categories; slug, label, image, showOnHome, storeType. |
| `products` | Name, description, price, salePrice, category, categorySlug, storeType, isVisible. |
| `productColors` | Per-product colors; name, hexCode, imageUrls. |
| `productVariants` | Size + stock per product+color. |
| `promoCodes` | Code, discountType, discountValue, minOrderAmount, maxUses, expiresAt. |
| `orders` | customerName, phone, address, city, subtotal, discount, shipping, total, status, paymentMethod. |
| `orderItems` | orderId, productId, quantity, size, priceAtPurchase. |
| `wishlists` | userId, productId. |
| `heroImages` | imageUrl, altText, order, storeType. |
| `homeVideo` | videoUrl, caption, storeType. |
| `lookbookItems` | label, imageUrl, href, storeType. |
| `sectionSettings` | sectionKey, isVisible (e.g. lookbook). |
