# Product Section Audit — Comprehensive Findings Report

**Date:** 2026-04-01
**Scope:** Images, Variants & Saving, Variant Data Model, Wholesale Availability
**Status:** Read-only audit — no changes made

---

## 1. Images

### 1.1 Storage Model

Two image storage mechanisms exist:

| Mechanism | Table | Fields | Used By |
|-----------|-------|--------|---------|
| Legacy single image | `products` | `image_url` (text) | All products (manual + imported) |
| Multi-image gallery | `product_images` | `url`, `storage_path`, `sort_order`, `is_primary` | Manual uploads only |

**`product_images` schema** (`database.ts:4539-4593`):
- `id` (uuid, PK)
- `product_id` (uuid, FK → products)
- `roaster_id` (uuid, FK → roasters)
- `storage_path` (text, **required on insert**)
- `url` (text, **required on insert**)
- `sort_order` (integer)
- `is_primary` (boolean)

### 1.2 Manual Upload Flow

1. User selects file in `ProductForm.tsx`
2. Image compressed via `compressImage()`, uploaded to `/api/upload` endpoint
3. Upload API stores file in Supabase `product-images` bucket at path `{roaster_id}/{timestamp}-{name}.{ext}`
4. Returns both `url` (Supabase public URL) and `path` (storage path)
5. On form save, images with `storage_path` are POSTed to `/api/products/{id}/images`
6. Image API **requires both `url` and `storage_path`** — rejects if either is missing
7. If `is_primary`, also updates `products.image_url` for backward compatibility

**This flow works correctly.**

### 1.3 Import Flow — External Images

All four import providers extract image URLs from their respective CDNs:

| Provider | CDN Domain | Extraction |
|----------|-----------|------------|
| Shopify | `cdn.shopify.com` | `p.image?.src \|\| p.images?.[0]?.src` |
| WooCommerce | varies by host | `p.images?.[0]?.src` |
| Squarespace | `images.squarespace-cdn.com` | `p.images?.[0]?.url` |
| Wix | varies | `p.media?.mainMedia?.image?.url` |

**What happens on import:**
- External CDN URL stored directly in `products.image_url` — **not re-uploaded to Supabase**
- **No `product_images` rows created** — imported images only exist in the legacy `image_url` column
- ProductForm seeds a synthetic image from `product.image_url` when no `product_images` rows exist, but **skips saving it** because it lacks `storage_path`

### 1.4 Issues Found

#### CRITICAL: Next.js Image hostname whitelist incomplete

**File:** `next.config.mjs:11-22`

Only two domains whitelisted:
- `cdn.sanity.io`
- `zaryzynzbpxmscggufdc.supabase.co`

**Missing:**
- `images.squarespace-cdn.com` (Squarespace)
- `cdn.shopify.com` (Shopify)
- WooCommerce CDN domains (varies by host)
- Wix CDN domains

**Impact:** `<Image>` component in storefront product cards and detail pages will **fail to load** any imported product images. Affects:
- `src/app/s/[slug]/_components/ProductCard.tsx`
- `src/app/s/[slug]/shop/product/[id]/ProductDetail.tsx`
- `src/app/(portal)/wholesale-portal/products/StorefrontProducts.tsx`

#### HIGH: Imported images not in `product_images` table

Imported products only have `products.image_url` set. The `product_images` table — which powers gallery display, sort order, and primary flag — has **zero rows** for imported products.

**Impact:** Any feature relying on `product_images` (gallery view, image reordering, multi-image display) will show nothing for imported products.

#### MEDIUM: Image save gate blocks imported images

`ProductForm.tsx:1287-1295` — the save loop filters `if (!existingIds.has(img.id) && img.storage_path)`. Since imported images have no `storage_path`, they are never persisted to `product_images` even if the user opens and saves the form.

#### LOW: CDN image permanence risk

External CDN URLs may become invalid if the roaster disconnects from or deletes products on their ecommerce platform. The platform has no local copy.

---

## 2. Variants & Saving

### 2.1 ProductForm Variant Matrix

The form represents variants as a **weight x grind matrix**:
- Roaster selects weight options (e.g., 250g, 500g, 1kg)
- Roaster selects grind types (from `roaster_grind_types` table)
- Matrix cells auto-generate for every combination
- Each cell has: SKU, stock count, track_stock, is_active
- Separate matrices for retail and wholesale channels

**Matrix cell key:** `{weight_grams}:{grind_type_id}`

### 2.2 Variant Reconstruction on Load

When loading an existing product (`ProductForm.tsx:491-546`):
1. Fetches existing variants from API
2. Separates by `channel` (retail vs wholesale)
3. For each variant with `weight_grams != null`:
   - Adds to weight options map
   - If `grind_type_id` exists, adds to selected grind types
   - Creates matrix cell keyed by `{weight_grams}:{grind_type_id}`
4. Sets `retailVariantsEnabled = true` if any retail variants found

**Problem:** Variants that lack `weight_grams` AND `grind_type_id` are **silently dropped** from the matrix. They exist in the database but are invisible in the form.

### 2.3 Save Flow — Variant Submission Logic

**`ProductForm.tsx:1222-1229`:**
```
if (flatVariants.length > 0 || variantUiActive) {
  body.variants = flatVariants;
}
```

Where `variantUiActive = retailVariantsEnabled || wholesaleVariantsEnabled || (category === "other" && otherVariantCells.length > 0)`

**Three outcomes on save:**

| Condition | variants sent? | API behavior |
|-----------|---------------|--------------|
| `variantUiActive=false` AND `flatVariants=[]` | No (undefined) | Existing variants **preserved** |
| `variantUiActive=true` AND `flatVariants=[...]` | Yes (populated) | Diff/merge: delete missing, upsert present |
| `variantUiActive=true` AND `flatVariants=[]` | Yes (**empty array**) | **All existing variants deleted** |

### 2.4 PUT Route Variant Handling

**`src/app/api/products/[id]/route.ts:277-364`:**
- If `Array.isArray(variants)` is true:
  - Gets existing variant IDs
  - Deletes any existing variant whose ID is NOT in the incoming array
  - Upserts incoming variants (update if ID exists, insert if new)
- If `variants` is undefined: no variant modifications

**This is a diff/merge pattern, NOT a delete-all-reinsert.** However, sending an empty array triggers deletion of ALL variants.

### 2.5 Issues Found

#### CRITICAL: Empty variants array deletes all imported variants

**Scenario:**
1. Import Squarespace product with variants that have non-standard attributes (e.g., `{"Custom": "Limited Edition"}`)
2. Weight/grind parsing fails → variants stored with `weight_grams=null, grind_type_id=null`
3. Form loads → sets `retailVariantsEnabled=true` (from line 492, because variants exist)
4. Matrix reconstruction finds no valid weight/grind combinations → matrix is empty
5. `flatVariants = []` but `variantUiActive = true`
6. Form submits **empty variants array** → API deletes all variants

**Impact:** Silent, irrecoverable data loss of imported variants.

#### HIGH: Variants without weight_grams/grind_type_id invisible in form

Any variant that doesn't fit the weight x grind matrix model is invisible. The user has no way to see, edit, or manage these variants in the form UI.

**Affected scenarios:**
- Squarespace variants with custom attributes (not weight/grind)
- Imported variants where weight parsing fails (non-standard format)
- Variants with `weight_grams=null` (no weight dimension)

#### MEDIUM: Retail-only variant export

**`export-products/route.ts:193`:** Export query filters `.eq("channel", "retail")`.

Products with only wholesale variants export with zero variants, creating a default single-SKU product on the external platform. `external_variant_ids` maps `__default__` to the store variant, leaving internal wholesale variants unmapped for stock sync.

---

## 3. Variant Data Model

### 3.1 Schema

**`product_variants` table** (`database.ts:4735-4826`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `product_id` | uuid | FK → products, CASCADE delete |
| `roaster_id` | uuid | FK → roasters, CASCADE delete |
| `weight_grams` | number \| null | Parsed from import or set manually |
| `unit` | string \| null | Display label (e.g., "250g", "1kg") |
| `grind_type_id` | string \| null | FK → roaster_grind_types, SET NULL on delete |
| `sku` | string \| null | |
| `retail_price` | number \| null | |
| `wholesale_price` | number \| null | |
| `retail_stock_count` | number \| null | |
| `track_stock` | boolean | Default false |
| `is_active` | boolean | Default true |
| `sort_order` | number | Default 0 |
| `channel` | string | CHECK: 'retail' or 'wholesale' |
| `wholesale_price_standard` | number \| null | Legacy tier pricing |
| `wholesale_price_preferred` | number \| null | Legacy tier pricing |
| `wholesale_price_vip` | number \| null | Legacy tier pricing |

### 3.2 Grind Types

Stored in `roaster_grind_types` table (per-roaster, not global). Fetched via `/api/settings/grind-types`. **Not hardcoded anywhere** — fully roaster-managed.

On import, grind labels are parsed via `GRIND_KEYWORDS` (`product-import.ts:75-90`) and auto-created in `roaster_grind_types` if they don't exist.

### 3.3 Channel Separation

- `channel` column: `'retail'` or `'wholesale'` (CHECK constraint)
- Default: `'retail'`
- Set on import based on `product.is_wholesale` flag
- Form maintains separate matrices per channel
- Export only fetches retail channel variants

### 3.4 Import Variant Mapping

**Weight parsing** (`product-import.ts:92-117`):
- Regex patterns: `{n}kg`, `{n}g`, `{n}oz`, `{n}lb`
- Fallback: bare number 50-5000 assumed grams
- If all parsing fails: `weight_grams = null`

**Grind parsing** (`product-import.ts:128-138`):
- Keyword match against 14 coffee grind terms
- If no keyword found: `grind_label = null`

**Squarespace-specific** (`product-import.ts:348-381`):
- Variant attributes (`{key: value}` dict) → values extracted as array
- Passed through weight and grind parsers
- Fallback to `shippingMeasurements.weight` for weight if attributes fail

### 3.5 External Variant ID Mapping

**`product_channel_mappings` table:**
- `external_variant_ids` JSONB: `{ "internal-uuid": "external-id" }`
- Created on export, updated on re-import
- Used for stock sync between platforms

### 3.6 Issues Found

#### HIGH: Round-trip parsing fidelity

Internal → External → Internal round-trip can lose data:
- Export formats `weight_grams` as display string (e.g., "250g")
- Re-import parses "250g" back to `weight_grams=250` — works for standard formats
- Non-standard attributes (e.g., Squarespace `{"Custom": "Limited Edition"}`) → parsing fails → `weight_grams=null, grind_type_id=null`
- These variants become "orphans" — stored but invisible in form UI

#### MEDIUM: Legacy tier pricing columns still in schema

`wholesale_price_standard`, `wholesale_price_preferred`, `wholesale_price_vip` still exist on `product_variants`. Migration backfilled `wholesale_price` from `wholesale_price_standard` but legacy columns remain. Not harmful but adds confusion.

---

## 4. Wholesale Availability

### 4.1 Wholesale Product Flags

| Field | Table | Default (manual) | Default (import) |
|-------|-------|-------------------|-------------------|
| `is_wholesale` | products | `true` | `false` |
| `is_retail` | products | `true` | `true` |
| `wholesale_price` | products | set by form | null unless CSV-mapped |
| `minimum_wholesale_quantity` | products | 1 | 1 |

**Key discrepancy:** New products created via form default `is_wholesale=true`, but imported products default `is_wholesale=false` unless explicitly mapped in CSV.

### 4.2 Wholesale Storefront Queries

Two storefront implementations with **different query filters**:

| Storefront | Route | Filter |
|------------|-------|--------|
| Slug-based | `/s/[slug]/wholesale/page.tsx` | `status = 'published'` AND `is_wholesale = true` |
| Domain-based | `/w/[domain]/wholesale/page.tsx` | `is_active = true` AND `is_wholesale = true` |

### 4.3 Wholesale Variant Filtering

**`WholesaleCatalogue.tsx:224-226`:** Variants displayed to wholesale buyers are filtered by:
- `v.is_active === true`
- `v.wholesale_price != null`

**Pricing fallback chain:** `variant.wholesale_price` → `product.wholesale_price` → `product.price`

### 4.4 Issues Found

#### CRITICAL: Storefront query inconsistency — `status` vs `is_active`

**`/s/[slug]/wholesale/page.tsx:93`:** `.eq("status", "published")`
**`/w/[domain]/wholesale/page.tsx:78`:** `.eq("is_active", true)`

These are **different columns with different semantics**:
- `status` is a text field: `'draft'`, `'published'`, `'archived'`
- `is_active` is a boolean

A product with `status='published'` and `is_active=false` would:
- **Appear** on slug storefront
- **Not appear** on domain storefront

A product with `status='draft'` and `is_active=true` would:
- **Not appear** on slug storefront
- **Appear** on domain storefront

**Impact:** Wholesale products show differently depending on which storefront URL the buyer uses.

#### HIGH: Orphaned wholesale listings

A product can have `is_wholesale=true` with zero wholesale-channel variants (or variants with `wholesale_price=null`). This creates a product that:
- Appears in the wholesale catalogue
- Shows product details to the buyer
- Has **no variants to add to cart** — buyer cannot order

This happens when:
- Roaster marks product as wholesale but doesn't create wholesale variants
- Product imported with `is_wholesale=true` but all variants have `channel='retail'`
- Wholesale variants exist but all have `wholesale_price=null`

#### MEDIUM: Import defaults `is_wholesale=false`

Products imported from ecommerce platforms default to `is_wholesale=false` (`product-import.ts:246`). If a roaster imports their Squarespace catalogue intending to sell wholesale, they must manually toggle `is_wholesale` on every product.

CSV import supports a `wholesale` / `is wholesale` column mapping, but this requires the source CSV to have such a column — unlikely for Squarespace/Shopify exports.

---

## Summary of All Issues by Severity

### CRITICAL (data loss or broken core functionality)

| # | Area | Issue | Location |
|---|------|-------|----------|
| 1 | Images | Next.js Image hostname whitelist missing imported CDN domains | `next.config.mjs:11-22` |
| 2 | Variants | Empty variants array on save deletes all imported variants | `ProductForm.tsx:1222-1229` |
| 3 | Wholesale | Slug vs domain storefronts use different query filters (`status` vs `is_active`) | `/s/[slug]/wholesale/page.tsx:93` vs `/w/[domain]/wholesale/page.tsx:78` |

### HIGH (significant UX or data integrity issues)

| # | Area | Issue | Location |
|---|------|-------|----------|
| 4 | Images | Imported images not added to `product_images` table | `product-import.ts:238` |
| 5 | Variants | Variants without weight_grams/grind_type_id invisible in form | `ProductForm.tsx:496-516` |
| 6 | Variants | Retail-only variant export — wholesale variants excluded | `export-products/route.ts:193` |
| 7 | Variants | Round-trip parsing can lose non-standard variant attributes | `product-import.ts:348-381` |
| 8 | Wholesale | Orphaned wholesale listings (product visible, no orderable variants) | `WholesaleCatalogue.tsx:224-226` |

### MEDIUM

| # | Area | Issue | Location |
|---|------|-------|----------|
| 9 | Images | Image save gate blocks imported images from `product_images` | `ProductForm.tsx:1287-1295` |
| 10 | Variants | Legacy tier pricing columns still in schema | `database.ts:4752-4754` |
| 11 | Wholesale | Import defaults `is_wholesale=false` — no automatic wholesale detection | `product-import.ts:246` |

### LOW

| # | Area | Issue | Location |
|---|------|-------|----------|
| 12 | Images | External CDN URLs may expire if source platform products deleted | All import flows |
