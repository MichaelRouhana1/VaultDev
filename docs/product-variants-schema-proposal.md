# Product options & variants — schema proposal

This document proposes database changes to move from hardcoded **size + color rows** (`product_colors` + `product_variants.size/stock`) toward a standard **options → option values → variants (SKU/stock)** model. Review and adjust before implementation.

---

## Current state (relevant pieces)

| Piece | Role |
|--------|------|
| **`product_colors`** | Per-product color + `imageUrls[]` (PDP galleries). |
| **`product_variants`** | `productId`, `colorId` → `product_colors`, **`size` (text)**, **`stock`** — inventory lives here, not on `products`. |
| **`products.color` (text)** | Legacy / display; no stock on `products`. |
| **`attributes` / `attribute_values` / `product_attribute_values`** | Shop filter facets only; not tied to purchasable SKUs or stock. |
| **`order_items`** | `productId`, **`size` (text)**, `priceAtPurchase` — no `variant_id` today. |
| **`notifications.variantId`** | FK → `product_variants.id`. |

---

## Proposed tables

### 1. `product_options`

Defines a dimension for **one product** (e.g. “Size”, “Color”, “Inseam”).

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | |
| `product_id` | int FK → `products.id` ON DELETE CASCADE | |
| `name` | text NOT NULL | e.g. `"Size"` |
| `sort_order` | int NOT NULL DEFAULT 0 | Admin + PDP ordering |

**Indexes:** `(product_id)`; optional unique `(product_id, lower(name))` to forbid duplicate option names per product.

---

### 2. `product_option_values`

Selectable values for one option (e.g. `32`, `34`, `Red`).

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | |
| `product_option_id` | int FK → `product_options.id` ON DELETE CASCADE | |
| `value` | text NOT NULL | Display string |
| `sort_order` | int NOT NULL DEFAULT 0 | |
| `product_color_id` | int NULL FK → `product_colors.id` ON DELETE SET NULL | **Optional bridge:** when this value is the “Color” dimension and should reuse existing galleries |

**Indexes:** `(product_option_id)`.

**Uniqueness (recommended):** `(product_option_id, value)` unique (decide exact vs `lower(value)` for case policy).

**Rationale for `product_color_id`:** Keeps `product_colors` in v1; only color-like values that map 1:1 to a color row need the link. Text-only options (e.g. Size) leave it null.

---

### 3. `product_variants` (reshape, same table name)

One **purchasable** row with **stock** (and optional price override).

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | Preserving IDs helps `notifications.variantId` if migration maps 1:1 |
| `product_id` | int FK → `products.id` ON DELETE CASCADE | |
| `sku` | text NOT NULL | **Globally unique** recommended |
| `price_override` | decimal(10,2) NULL | NULL = use product base / sale logic |
| `stock_quantity` | int NOT NULL DEFAULT 0 | Can keep column name `stock` in DB if you want less churn |

**Remove after migration:** `color_id`, `size` — replaced by `variant_option_values`.

**Indexes:** `(product_id)`; unique `(sku)`.

---

### 4. `variant_option_values` (junction)

Links each variant to the **product_option_values** it represents (typically one value per option).

| Column | Type | Notes |
|--------|------|--------|
| `product_variant_id` | int FK → `product_variants.id` ON DELETE CASCADE | |
| `product_option_value_id` | int FK → `product_option_values.id` ON DELETE CASCADE | |

**Primary key:** `(product_variant_id, product_option_value_id)`.

**Index:** `(product_option_value_id)` for filters such as “products that have an in-stock variant with Size 32”.

**Constraint (recommended):** Ensure a variant does not pick two values from the **same** `product_option`. Options:

- Denormalize `product_option_id` onto `product_option_values` (already implied by FK) and add a junction column `product_option_id` with **unique `(product_variant_id, product_option_id)`**, or  
- Enforce in application + tests only.

---

## Relationship to existing concepts

| Topic | Proposal |
|--------|-----------|
| **Attributes** | Keep for non-stock merchandising filters. **Variant options** power PDP selection + **dynamic sidebar filters** scoped to in-stock variants in the current listing. |
| **`product_colors`** | Retained; link via **`product_option_values.product_color_id`** where needed. |
| **`products.color` (text)** | Phase out for new products; nullable for legacy until migrated. |
| **`order_items`** | Add **`product_variant_id`** (nullable initially); backfill from `(product_id, size)` + color where possible; prefer variant id for stock decrements long term. |
| **Checkout / `placeOrder`** | Resolve line to **`product_variants.id`**; decrement **`stock_quantity`** (or `stock`). |

---

## Migration outline (follow-up SQL / Drizzle)

1. Create `product_options`, `product_option_values`, `variant_option_values`.
2. Add new columns on `product_variants` (`sku`, `price_override`, `stock_quantity` or rename `stock`).
3. For each legacy row `(product, color, size, stock)`:
   - Ensure options (e.g. “Color”, “Size”) and option values (color name with `product_color_id`, size string).
   - Insert junction rows for that variant.
   - Set `sku` (e.g. `P{productId}-C{colorId}-S{normalizedSize}`) until admins edit.
4. Drop `color_id` / `size` from `product_variants` once all readers/writers use the new model.
5. Extend `order_items` and order pipeline when ready.

---

## Decisions to lock before coding

1. **SKU scope:** Global unique vs unique per `product_id` — global is typical for WMS/integrations.
2. **Pricing:** Variant override only where set; base sale logic stays on `products` unless you decide otherwise.
3. **“No options” products:** One synthetic variant vs a single “Default” option — affects admin toggle UX.
4. **Filter URLs:** Whether option values need a **slug** or normalized key column in addition to display `value`.

---

## Next implementation steps (after approval)

1. Update `db/schema.ts` and add a numbered migration under `drizzle/`.
2. Data migration script or SQL for existing `product_variants` / `product_colors`.
3. Admin create/update product flows (options builder + variant matrix).
4. Storefront queries: aggregate option names/values for visible products with `stock_quantity > 0`; apply facet filters in shop listing.
