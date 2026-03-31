// ═══════════════════════════════════════════════════════════════
// CSV → NormalisedProduct parsing — shared between client & API
// ═══════════════════════════════════════════════════════════════

import Papa from "papaparse";
import {
  type NormalisedProduct,
  type NormalisedVariant,
  parseWeightFromOptions,
  formatWeightUnit,
} from "@/lib/product-import";

// ─── GR Field types ──────────────────────────────────────────

export type GRField =
  | "name"
  | "description"
  | "origin"
  | "tasting_notes"
  | "sku"
  | "retail_price"
  | "wholesale_price"
  | "weight"
  | "grind_type"
  | "retail_stock_count"
  | "track_stock"
  | "status"
  | "image_url"
  | "is_retail"
  | "is_wholesale"
  | "minimum_wholesale_quantity"
  | "brand"
  | "gtin"
  | "vat_rate"
  | "meta_description"
  | "option1_name"
  | "option1_value"
  | "option2_name"
  | "option2_value"
  | "ignore";

export const GR_FIELDS: { value: GRField; label: string; group: "product" | "variant" | "meta" }[] = [
  { value: "name", label: "Product Name", group: "product" },
  { value: "description", label: "Description", group: "product" },
  { value: "origin", label: "Origin", group: "product" },
  { value: "tasting_notes", label: "Tasting Notes", group: "product" },
  { value: "brand", label: "Brand", group: "product" },
  { value: "image_url", label: "Image URL", group: "product" },
  { value: "status", label: "Status", group: "product" },
  { value: "is_retail", label: "Is Retail", group: "product" },
  { value: "is_wholesale", label: "Is Wholesale", group: "product" },
  { value: "minimum_wholesale_quantity", label: "Min Wholesale Qty", group: "product" },
  { value: "sku", label: "SKU", group: "variant" },
  { value: "retail_price", label: "Retail Price", group: "variant" },
  { value: "wholesale_price", label: "Wholesale Price", group: "variant" },
  { value: "weight", label: "Weight", group: "variant" },
  { value: "grind_type", label: "Grind Type", group: "variant" },
  { value: "retail_stock_count", label: "Stock Count", group: "variant" },
  { value: "track_stock", label: "Track Stock", group: "variant" },
  { value: "option1_name", label: "Option 1 Name", group: "variant" },
  { value: "option1_value", label: "Option 1 Value", group: "variant" },
  { value: "option2_name", label: "Option 2 Name", group: "variant" },
  { value: "option2_value", label: "Option 2 Value", group: "variant" },
  { value: "gtin", label: "GTIN", group: "meta" },
  { value: "vat_rate", label: "VAT Rate", group: "meta" },
  { value: "meta_description", label: "Meta Description", group: "meta" },
  { value: "ignore", label: "— Ignore —", group: "meta" },
];

// ─── Auto-mapping ────────────────────────────────────────────

const HEADER_ALIASES: Record<string, GRField> = {
  "product name": "name",
  name: "name",
  title: "name",
  "product title": "name",
  description: "description",
  "product description": "description",
  body: "description",
  "body html": "description",
  origin: "origin",
  country: "origin",
  "tasting notes": "tasting_notes",
  "tasting note": "tasting_notes",
  flavour: "tasting_notes",
  flavor: "tasting_notes",
  "flavour notes": "tasting_notes",
  sku: "sku",
  "variant sku": "sku",
  barcode: "gtin",
  gtin: "gtin",
  ean: "gtin",
  upc: "gtin",
  price: "retail_price",
  "retail price": "retail_price",
  "variant price": "retail_price",
  "selling price": "retail_price",
  "wholesale price": "wholesale_price",
  "trade price": "wholesale_price",
  weight: "weight",
  "weight (g)": "weight",
  "variant grams": "weight",
  size: "weight",
  "grind type": "grind_type",
  grind: "grind_type",
  "grind option": "grind_type",
  stock: "retail_stock_count",
  "stock count": "retail_stock_count",
  "stock quantity": "retail_stock_count",
  inventory: "retail_stock_count",
  "inventory qty": "retail_stock_count",
  "track stock": "track_stock",
  "track inventory": "track_stock",
  status: "status",
  published: "status",
  "image url": "image_url",
  image: "image_url",
  "image src": "image_url",
  "is retail": "is_retail",
  retail: "is_retail",
  "is wholesale": "is_wholesale",
  wholesale: "is_wholesale",
  "min wholesale qty": "minimum_wholesale_quantity",
  "minimum wholesale quantity": "minimum_wholesale_quantity",
  "minimum order": "minimum_wholesale_quantity",
  brand: "brand",
  "vat rate": "vat_rate",
  vat: "vat_rate",
  tax: "vat_rate",
  "meta description": "meta_description",
  "seo description": "meta_description",
  "option1 name": "option1_name",
  "option 1 name": "option1_name",
  "option1 value": "option1_value",
  "option 1 value": "option1_value",
  "option2 name": "option2_name",
  "option 2 name": "option2_name",
  "option2 value": "option2_value",
  "option 2 value": "option2_value",
};

export function autoMapHeaders(
  csvHeaders: string[]
): Record<string, GRField> {
  const mapping: Record<string, GRField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (HEADER_ALIASES[key]) {
      mapping[header] = HEADER_ALIASES[key];
    }
  }
  return mapping;
}

// ─── CSV → NormalisedProduct[] ───────────────────────────────

function parseBool(val: string | undefined | null): boolean | null {
  if (!val) return null;
  const lower = val.toLowerCase().trim();
  if (["yes", "true", "1", "y"].includes(lower)) return true;
  if (["no", "false", "0", "n"].includes(lower)) return false;
  return null;
}

export function parseNum(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[£$€,]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function getMappedValue(
  row: Record<string, string>,
  mapping: Record<string, GRField>,
  field: GRField
): string | undefined {
  for (const [csvCol, grField] of Object.entries(mapping)) {
    if (grField === field && row[csvCol] !== undefined) {
      const val = row[csvCol]?.trim();
      if (val) return val;
    }
  }
  return undefined;
}

export interface CsvImportInput {
  csvText: string;
  mapping: Record<string, GRField>;
  defaultCategory?: string;
  defaultIsRetail?: boolean;
  defaultIsWholesale?: boolean;
}

export function csvToNormalisedProducts(
  input: CsvImportInput
): { products: NormalisedProduct[]; errors: string[] } {
  const { csvText, mapping, defaultCategory, defaultIsRetail, defaultIsWholesale } = input;
  const errors: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push(`CSV row ${e.row ?? "?"}: ${e.message}`);
    }
  }

  if (parsed.data.length === 0) {
    errors.push("CSV contains no data rows");
    return { products: [], errors };
  }

  const hasNameMapping = Object.values(mapping).includes("name");
  if (!hasNameMapping) {
    errors.push('No column mapped to "Product Name" — this field is required');
    return { products: [], errors };
  }

  // Group rows by product name
  const productGroups = new Map<string, Record<string, string>[]>();

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const name = getMappedValue(row, mapping, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: Missing product name, skipped`);
      continue;
    }
    const key = name.toLowerCase().trim();
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(row);
  }

  const products: NormalisedProduct[] = [];
  let productIndex = 0;

  for (const [, rows] of Array.from(productGroups)) {
    const firstRow = rows[0];
    productIndex++;

    const name = getMappedValue(firstRow, mapping, "name")!;
    const description = getMappedValue(firstRow, mapping, "description") || null;
    const origin = getMappedValue(firstRow, mapping, "origin") || null;
    const tastingNotes = getMappedValue(firstRow, mapping, "tasting_notes") || null;
    const brand = getMappedValue(firstRow, mapping, "brand") || null;
    const gtin = getMappedValue(firstRow, mapping, "gtin") || null;
    const imageUrl = getMappedValue(firstRow, mapping, "image_url") || null;
    const metaDescription = getMappedValue(firstRow, mapping, "meta_description") || null;

    const statusRaw = getMappedValue(firstRow, mapping, "status");
    const status = statusRaw?.toLowerCase() === "draft" ? "draft" : "published";

    const isRetailRaw = parseBool(getMappedValue(firstRow, mapping, "is_retail"));
    const isWholesaleRaw = parseBool(getMappedValue(firstRow, mapping, "is_wholesale"));
    const isRetail = isRetailRaw ?? defaultIsRetail ?? true;
    const isWholesale = isWholesaleRaw ?? defaultIsWholesale ?? false;

    const vatRate = parseNum(getMappedValue(firstRow, mapping, "vat_rate"));
    const minWholesaleQty = parseNum(getMappedValue(firstRow, mapping, "minimum_wholesale_quantity"));

    const variants: NormalisedVariant[] = [];

    for (let vi = 0; vi < rows.length; vi++) {
      const row = rows[vi];
      const sku = getMappedValue(row, mapping, "sku") || null;
      const retailPrice = parseNum(getMappedValue(row, mapping, "retail_price"));
      const wholesalePrice = parseNum(getMappedValue(row, mapping, "wholesale_price"));
      const stockCount = parseNum(getMappedValue(row, mapping, "retail_stock_count"));
      const trackStockRaw = parseBool(getMappedValue(row, mapping, "track_stock"));
      const trackStock = trackStockRaw ?? (stockCount != null);

      const weightRaw = getMappedValue(row, mapping, "weight");
      let weightGrams: number | null = null;
      let unit: string | null = null;
      if (weightRaw) {
        const weightParsed = parseWeightFromOptions([weightRaw]);
        if (weightParsed) {
          weightGrams = weightParsed.grams;
          unit = weightParsed.unit;
        }
      }

      const grindRaw = getMappedValue(row, mapping, "grind_type");
      const grindLabel = grindRaw || null;

      const option1Name = getMappedValue(row, mapping, "option1_name") || null;
      const option1Value = getMappedValue(row, mapping, "option1_value") || null;
      const option2Name = getMappedValue(row, mapping, "option2_name") || null;
      const option2Value = getMappedValue(row, mapping, "option2_value") || null;

      variants.push({
        external_id: `csv-${productIndex}-${vi}`,
        sku,
        price: retailPrice,
        wholesale_price: wholesalePrice,
        weight_grams: weightGrams,
        unit: unit || formatWeightUnit(weightGrams),
        grind_label: grindLabel,
        stock_quantity: stockCount != null ? Math.round(stockCount) : null,
        track_stock: trackStock,
        image_url: null,
        option1_name: option1Name,
        option1_value: option1Value,
        option2_name: option2Name,
        option2_value: option2Value,
      });
    }

    const firstVariant = variants[0];
    const productPrice = firstVariant?.price ?? null;
    const productStockCount = firstVariant?.stock_quantity ?? null;
    const productTrackStock = variants.some((v) => v.track_stock);

    products.push({
      external_id: `csv-${productIndex}`,
      name,
      description,
      image_url: imageUrl,
      sku: firstVariant?.sku || null,
      price: productPrice,
      status,
      track_stock: productTrackStock,
      stock_quantity: productStockCount,
      variants,
      category: defaultCategory || "coffee",
      origin: origin || undefined,
      tasting_notes: tastingNotes || undefined,
      brand: brand || undefined,
      gtin: gtin || undefined,
      vat_rate: vatRate ?? undefined,
      meta_description: metaDescription || undefined,
      is_retail: isRetail,
      is_wholesale: isWholesale,
      minimum_wholesale_quantity: minWholesaleQty ?? undefined,
    });
  }

  return { products, errors };
}
