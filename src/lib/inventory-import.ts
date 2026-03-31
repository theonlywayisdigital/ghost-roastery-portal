// ═══════════════════════════════════════════════════════════════
// CSV → Inventory parsing — Green Beans & Roasted Stock
// ═══════════════════════════════════════════════════════════════

import Papa from "papaparse";
import { parseNum } from "@/lib/csv-import";
import type { FieldOption } from "@/components/products/CsvFieldMapper";

// ─── Green Bean Field types ─────────────────────────────────

export type GreenBeanField =
  | "name"
  | "origin_country"
  | "origin_region"
  | "variety"
  | "process"
  | "lot_number"
  | "supplier_name"
  | "arrival_date"
  | "cost_per_kg"
  | "cupping_score"
  | "tasting_notes"
  | "altitude_masl"
  | "harvest_year"
  | "current_stock_kg"
  | "low_stock_threshold_kg"
  | "notes"
  | "ignore";

export type RoastedStockField =
  | "name"
  | "green_bean_name"
  | "current_stock_kg"
  | "low_stock_threshold_kg"
  | "batch_size_kg"
  | "notes"
  | "ignore";

// ─── Field options for mapper ───────────────────────────────

export const GREEN_BEAN_FIELDS: FieldOption<GreenBeanField>[] = [
  { value: "ignore", label: "\u2014 Ignore \u2014", group: "" },
  { value: "name", label: "Bean Name", group: "Identity" },
  { value: "origin_country", label: "Origin Country", group: "Identity" },
  { value: "origin_region", label: "Origin Region", group: "Identity" },
  { value: "variety", label: "Variety / Cultivar", group: "Identity" },
  { value: "process", label: "Process", group: "Identity" },
  { value: "lot_number", label: "Lot Number", group: "Identity" },
  { value: "supplier_name", label: "Supplier Name", group: "Purchase" },
  { value: "arrival_date", label: "Arrival Date", group: "Purchase" },
  { value: "cost_per_kg", label: "Cost per kg", group: "Purchase" },
  { value: "cupping_score", label: "Cupping Score", group: "Quality" },
  { value: "tasting_notes", label: "Tasting Notes", group: "Quality" },
  { value: "altitude_masl", label: "Altitude (masl)", group: "Quality" },
  { value: "harvest_year", label: "Harvest Year", group: "Quality" },
  { value: "current_stock_kg", label: "Current Stock (kg)", group: "Stock" },
  { value: "low_stock_threshold_kg", label: "Low Stock Threshold (kg)", group: "Stock" },
  { value: "notes", label: "Notes", group: "Other" },
];

export const ROASTED_STOCK_FIELDS: FieldOption<RoastedStockField>[] = [
  { value: "ignore", label: "\u2014 Ignore \u2014", group: "" },
  { value: "name", label: "Stock Name", group: "Identity" },
  { value: "green_bean_name", label: "Source Green Bean", group: "Identity" },
  { value: "current_stock_kg", label: "Current Stock (kg)", group: "Stock" },
  { value: "low_stock_threshold_kg", label: "Low Stock Threshold (kg)", group: "Stock" },
  { value: "batch_size_kg", label: "Batch Size (kg)", group: "Stock" },
  { value: "notes", label: "Notes", group: "Other" },
];

// ─── Auto-mapping aliases ───────────────────────────────────

const GREEN_BEAN_ALIASES: Record<string, GreenBeanField> = {
  name: "name",
  "bean name": "name",
  "green bean": "name",
  "bean": "name",
  origin: "origin_country",
  country: "origin_country",
  "origin country": "origin_country",
  region: "origin_region",
  "origin region": "origin_region",
  variety: "variety",
  cultivar: "variety",
  varietal: "variety",
  process: "process",
  "processing method": "process",
  "lot number": "lot_number",
  lot: "lot_number",
  "lot no": "lot_number",
  supplier: "supplier_name",
  "supplier name": "supplier_name",
  vendor: "supplier_name",
  "arrival date": "arrival_date",
  arrived: "arrival_date",
  "date received": "arrival_date",
  "cost per kg": "cost_per_kg",
  "cost/kg": "cost_per_kg",
  cost: "cost_per_kg",
  price: "cost_per_kg",
  "price per kg": "cost_per_kg",
  "cupping score": "cupping_score",
  cupping: "cupping_score",
  score: "cupping_score",
  "tasting notes": "tasting_notes",
  "tasting note": "tasting_notes",
  flavour: "tasting_notes",
  flavor: "tasting_notes",
  altitude: "altitude_masl",
  "altitude masl": "altitude_masl",
  elevation: "altitude_masl",
  "harvest year": "harvest_year",
  harvest: "harvest_year",
  crop: "harvest_year",
  stock: "current_stock_kg",
  "current stock": "current_stock_kg",
  "stock kg": "current_stock_kg",
  "current stock kg": "current_stock_kg",
  quantity: "current_stock_kg",
  "qty kg": "current_stock_kg",
  "low stock threshold": "low_stock_threshold_kg",
  threshold: "low_stock_threshold_kg",
  "low threshold": "low_stock_threshold_kg",
  "min stock": "low_stock_threshold_kg",
  notes: "notes",
  comments: "notes",
  description: "notes",
};

const ROASTED_STOCK_ALIASES: Record<string, RoastedStockField> = {
  name: "name",
  "stock name": "name",
  "roasted stock": "name",
  "roast name": "name",
  coffee: "name",
  "green bean": "green_bean_name",
  "green bean name": "green_bean_name",
  "source bean": "green_bean_name",
  "source": "green_bean_name",
  "from bean": "green_bean_name",
  stock: "current_stock_kg",
  "current stock": "current_stock_kg",
  "stock kg": "current_stock_kg",
  "current stock kg": "current_stock_kg",
  quantity: "current_stock_kg",
  "qty kg": "current_stock_kg",
  "low stock threshold": "low_stock_threshold_kg",
  threshold: "low_stock_threshold_kg",
  "low threshold": "low_stock_threshold_kg",
  "min stock": "low_stock_threshold_kg",
  "batch size": "batch_size_kg",
  "batch size kg": "batch_size_kg",
  batch: "batch_size_kg",
  notes: "notes",
  comments: "notes",
  description: "notes",
};

export function autoMapGreenBeanHeaders(
  csvHeaders: string[]
): Record<string, GreenBeanField> {
  const mapping: Record<string, GreenBeanField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (GREEN_BEAN_ALIASES[key]) {
      mapping[header] = GREEN_BEAN_ALIASES[key];
    }
  }
  return mapping;
}

export function autoMapRoastedStockHeaders(
  csvHeaders: string[]
): Record<string, RoastedStockField> {
  const mapping: Record<string, RoastedStockField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (ROASTED_STOCK_ALIASES[key]) {
      mapping[header] = ROASTED_STOCK_ALIASES[key];
    }
  }
  return mapping;
}

// ─── Normalised interfaces ──────────────────────────────────

export interface NormalisedGreenBean {
  name: string;
  origin_country: string | null;
  origin_region: string | null;
  variety: string | null;
  process: string | null;
  lot_number: string | null;
  supplier_name: string | null;
  arrival_date: string | null;
  cost_per_kg: number | null;
  cupping_score: number | null;
  tasting_notes: string | null;
  altitude_masl: number | null;
  harvest_year: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  notes: string | null;
}

export interface NormalisedRoastedStock {
  name: string;
  green_bean_name: string | null;
  current_stock_kg: number;
  low_stock_threshold_kg: number | null;
  batch_size_kg: number | null;
  notes: string | null;
}

export interface InventoryImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

// ─── Helper: get mapped value ───────────────────────────────

function getMapped<T extends string>(
  row: Record<string, string>,
  mapping: Record<string, T>,
  field: T
): string | undefined {
  for (const [csvCol, mappedField] of Object.entries(mapping)) {
    if (mappedField === field && row[csvCol] !== undefined) {
      const val = row[csvCol]?.trim();
      if (val) return val;
    }
  }
  return undefined;
}

// ─── CSV → NormalisedGreenBean[] ────────────────────────────

export function csvToNormalisedGreenBeans(input: {
  csvText: string;
  mapping: Record<string, GreenBeanField>;
}): { beans: NormalisedGreenBean[]; errors: string[] } {
  const { csvText, mapping } = input;
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
    return { beans: [], errors };
  }

  const hasNameMapping = Object.values(mapping).includes("name");
  if (!hasNameMapping) {
    errors.push('No column mapped to "Bean Name" \u2014 this field is required');
    return { beans: [], errors };
  }

  const beans: NormalisedGreenBean[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const name = getMapped(row, mapping, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: Missing bean name, skipped`);
      continue;
    }

    beans.push({
      name,
      origin_country: getMapped(row, mapping, "origin_country") || null,
      origin_region: getMapped(row, mapping, "origin_region") || null,
      variety: getMapped(row, mapping, "variety") || null,
      process: getMapped(row, mapping, "process") || null,
      lot_number: getMapped(row, mapping, "lot_number") || null,
      supplier_name: getMapped(row, mapping, "supplier_name") || null,
      arrival_date: getMapped(row, mapping, "arrival_date") || null,
      cost_per_kg: parseNum(getMapped(row, mapping, "cost_per_kg")),
      cupping_score: parseNum(getMapped(row, mapping, "cupping_score")),
      tasting_notes: getMapped(row, mapping, "tasting_notes") || null,
      altitude_masl: parseNum(getMapped(row, mapping, "altitude_masl")) != null
        ? Math.round(parseNum(getMapped(row, mapping, "altitude_masl"))!)
        : null,
      harvest_year: getMapped(row, mapping, "harvest_year") || null,
      current_stock_kg: parseNum(getMapped(row, mapping, "current_stock_kg")) ?? 0,
      low_stock_threshold_kg: parseNum(getMapped(row, mapping, "low_stock_threshold_kg")),
      notes: getMapped(row, mapping, "notes") || null,
    });
  }

  return { beans, errors };
}

// ─── CSV → NormalisedRoastedStock[] ─────────────────────────

export function csvToNormalisedRoastedStock(input: {
  csvText: string;
  mapping: Record<string, RoastedStockField>;
}): { stock: NormalisedRoastedStock[]; errors: string[] } {
  const { csvText, mapping } = input;
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
    return { stock: [], errors };
  }

  const hasNameMapping = Object.values(mapping).includes("name");
  if (!hasNameMapping) {
    errors.push('No column mapped to "Stock Name" \u2014 this field is required');
    return { stock: [], errors };
  }

  const stock: NormalisedRoastedStock[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const name = getMapped(row, mapping, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: Missing stock name, skipped`);
      continue;
    }

    stock.push({
      name,
      green_bean_name: getMapped(row, mapping, "green_bean_name") || null,
      current_stock_kg: parseNum(getMapped(row, mapping, "current_stock_kg")) ?? 0,
      low_stock_threshold_kg: parseNum(getMapped(row, mapping, "low_stock_threshold_kg")),
      batch_size_kg: parseNum(getMapped(row, mapping, "batch_size_kg")),
      notes: getMapped(row, mapping, "notes") || null,
    });
  }

  return { stock, errors };
}
