// ═══════════════════════════════════════════════════════════════
// Roast log CSV/Excel import — field definitions, aliases & normalisation
// ═══════════════════════════════════════════════════════════════

import type { FieldOption } from "@/components/products/CsvFieldMapper";
import { parseNum } from "@/lib/csv-import";

// ─── Field types ────────────────────────────────────────────

export type RoastLogField =
  | "roast_profile"   // Required — matched to roasted_stock name
  | "roast_date"      // Required
  | "green_weight_kg" // Required
  | "roasted_weight_kg" // Required
  | "batch_number"
  | "green_lots"      // Green bean name (for auto-linking)
  | "duration"        // mm:ss
  | "charge_temp_c"
  | "drop_temp_c"
  | "dev_time"        // mm:ss
  | "first_crack"     // mm:ss
  | "machine"
  | "operator"
  | "notes"
  | "ignore";

export const ROAST_LOG_FIELDS: FieldOption<RoastLogField>[] = [
  { value: "ignore", label: "— Skip —", group: "" },
  { value: "roast_profile", label: "Roast Profile", group: "Required" },
  { value: "roast_date", label: "Roast Date", group: "Required" },
  { value: "green_weight_kg", label: "Green Weight (kg)", group: "Required" },
  { value: "roasted_weight_kg", label: "Roasted Weight (kg)", group: "Required" },
  { value: "batch_number", label: "Batch Number", group: "Optional" },
  { value: "green_lots", label: "Green Lots / Bean Name", group: "Optional" },
  { value: "duration", label: "Duration (mm:ss)", group: "Optional" },
  { value: "charge_temp_c", label: "Charge Temp (°C)", group: "Optional" },
  { value: "drop_temp_c", label: "Drop Temp (°C)", group: "Optional" },
  { value: "dev_time", label: "Dev Time (mm:ss)", group: "Optional" },
  { value: "first_crack", label: "First Crack (mm:ss)", group: "Optional" },
  { value: "machine", label: "Machine", group: "Optional" },
  { value: "operator", label: "Operator", group: "Optional" },
  { value: "notes", label: "Notes", group: "Optional" },
];

// ─── Aliases for auto-detection ───────────────────────────────

const ROAST_LOG_ALIASES: Record<string, RoastLogField> = {
  // Cropster exact headers
  "roast name": "roast_profile",
  "id tag": "batch_number",
  "roast date": "roast_date",
  "start weight": "green_weight_kg",
  "end weight": "roasted_weight_kg",
  "duration": "duration",
  "start temp.": "charge_temp_c",
  "start temp": "charge_temp_c",
  "end temp.": "drop_temp_c",
  "end temp": "drop_temp_c",
  "dev. time": "dev_time",
  "dev time": "dev_time",
  "first crack": "first_crack",
  "machine": "machine",
  "notes": "notes",
  "green lots": "green_lots",
  "green lot": "green_lots",
  "green bean": "green_lots",
  "green coffee": "green_lots",
  "green bean name": "green_lots",

  // Generic aliases
  "profile": "roast_profile",
  "roast profile": "roast_profile",
  "bean": "roast_profile",
  "bean name": "roast_profile",
  "coffee": "roast_profile",
  "coffee name": "roast_profile",
  "blend": "roast_profile",
  "product": "roast_profile",

  "date": "roast_date",
  "roasted date": "roast_date",
  "roast date/time": "roast_date",
  "timestamp": "roast_date",

  "green weight": "green_weight_kg",
  "green weight (kg)": "green_weight_kg",
  "green (kg)": "green_weight_kg",
  "input weight": "green_weight_kg",
  "input weight (kg)": "green_weight_kg",
  "charge weight": "green_weight_kg",
  "start weight (kg)": "green_weight_kg",
  "batch size": "green_weight_kg",

  "roasted weight": "roasted_weight_kg",
  "roasted weight (kg)": "roasted_weight_kg",
  "roasted (kg)": "roasted_weight_kg",
  "output weight": "roasted_weight_kg",
  "output weight (kg)": "roasted_weight_kg",
  "end weight (kg)": "roasted_weight_kg",
  "drop weight": "roasted_weight_kg",
  "finished weight": "roasted_weight_kg",

  "batch": "batch_number",
  "batch #": "batch_number",
  "batch no": "batch_number",
  "batch number": "batch_number",
  "lot": "batch_number",
  "lot number": "batch_number",
  "roast number": "batch_number",
  "roast #": "batch_number",
  "roast id": "batch_number",

  "roast time": "duration",
  "total time": "duration",
  "time": "duration",
  "roast duration": "duration",

  "charge temp": "charge_temp_c",
  "charge temperature": "charge_temp_c",
  "charge temp (°c)": "charge_temp_c",
  "bt charge": "charge_temp_c",
  "start temperature": "charge_temp_c",

  "drop temp": "drop_temp_c",
  "drop temperature": "drop_temp_c",
  "drop temp (°c)": "drop_temp_c",
  "end temperature": "drop_temp_c",
  "bt drop": "drop_temp_c",
  "finish temp": "drop_temp_c",

  "development time": "dev_time",
  "development": "dev_time",
  "dtr": "dev_time",

  "first crack time": "first_crack",
  "1st crack": "first_crack",
  "fc": "first_crack",
  "fc time": "first_crack",
  "crack": "first_crack",

  "roaster": "machine",
  "roaster machine": "machine",
  "equipment": "machine",

  "roaster name": "operator",
  "roasted by": "operator",
  "user": "operator",

  "comment": "notes",
  "comments": "notes",
  "memo": "notes",
  "description": "notes",
};

// ─── Auto-mapping ─────────────────────────────────────────────

export function autoMapRoastLogHeaders(
  csvHeaders: string[]
): Record<string, RoastLogField> {
  const mapping: Record<string, RoastLogField> = {};
  const usedFields = new Set<RoastLogField>();

  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    const mapped = ROAST_LOG_ALIASES[key];
    if (mapped && !usedFields.has(mapped)) {
      mapping[header] = mapped;
      usedFields.add(mapped);
    }
  }
  return mapping;
}

// ─── Normalised roast log row ─────────────────────────────────

export interface NormalisedRoastLog {
  roast_profile: string;
  roast_date: string;
  green_weight_kg: number;
  roasted_weight_kg: number;
  batch_number: string | null;
  green_lots: string | null;
  duration_seconds: number | null;
  charge_temp_c: number | null;
  drop_temp_c: number | null;
  dev_time_seconds: number | null;
  first_crack_seconds: number | null;
  machine: string | null;
  operator: string | null;
  notes: string | null;
}

export interface RoastLogImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

// ─── Time parsing: "mm:ss" or "m:ss" or seconds ───────────────

function parseTimeToSeconds(val: string | undefined | null): number | null {
  if (!val) return null;
  const trimmed = val.trim();

  // mm:ss or m:ss format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  // Plain seconds
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    // If > 200, assume seconds; otherwise assume minutes
    return num > 200 ? Math.round(num) : Math.round(num * 60);
  }

  return null;
}

// ─── Date parsing ─────────────────────────────────────────────

function parseDateToISO(val: string | undefined | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // 1. Excel serial date number (e.g. 46132 = a date in 2026)
  //    Serial dates are typically 5-digit numbers between ~1 and ~60000
  const asNum = Number(trimmed);
  if (!isNaN(asNum) && asNum > 1 && asNum < 100000 && /^\d+(\.\d+)?$/.test(trimmed)) {
    // Excel epoch is 1899-12-30, but has the Lotus 1-2-3 leap year bug (day 60 = Feb 29 1900)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + asNum * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }

  // 2. Cropster format: "DD/MM/YYYY - HH:mm" (strip time suffix before parsing)
  const cropsterMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s*-\s*\d{1,2}:\d{2}/);
  if (cropsterMatch) {
    const [, day, month, year] = cropsterMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // 3. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (no time suffix)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }

  // 4. YYYY-MM-DD (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }

  // 5. MM/DD/YYYY (US format — only if month <= 12 and day > 12 to disambiguate)
  const mdyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdyMatch) {
    const [, part1, part2, year] = mdyMatch;
    const p1 = parseInt(part1), p2 = parseInt(part2);
    // If part1 <= 12 and part2 > 12, treat as MM/DD/YYYY
    if (p1 <= 12 && p2 > 12) {
      const parsed = new Date(`${year}-${part1.padStart(2, "0")}-${part2.padStart(2, "0")}`);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    }
  }

  // 6. Fallback: try native Date constructor (handles various formats)
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}

// ─── Weight parsing (handles g and kg) ────────────────────────

function parseWeightKg(val: string | undefined | null): number | null {
  if (!val) return null;
  const trimmed = val.trim().toLowerCase();

  // Remove trailing "kg" or "g"
  if (trimmed.endsWith("kg")) {
    const num = parseFloat(trimmed.replace(/kg$/i, "").trim());
    return isNaN(num) ? null : num;
  }
  if (trimmed.endsWith("g") && !trimmed.endsWith("kg")) {
    const num = parseFloat(trimmed.replace(/g$/i, "").trim());
    return isNaN(num) ? null : num / 1000;
  }

  const num = parseNum(trimmed);
  if (num === null) return null;

  // Heuristic: if > 100, assume grams
  return num > 100 ? num / 1000 : num;
}

// ─── CSV → Normalised conversion ──────────────────────────────

function getMapped(
  row: Record<string, string>,
  mapping: Record<string, RoastLogField>,
  field: RoastLogField
): string | undefined {
  for (const [csvCol, mappedField] of Object.entries(mapping)) {
    if (mappedField === field && row[csvCol] !== undefined) {
      const val = row[csvCol]?.trim();
      if (val) return val;
    }
  }
  return undefined;
}

export function parseRoastLogRows(
  rows: Record<string, string>[],
  mapping: Record<string, RoastLogField>
): { logs: NormalisedRoastLog[]; errors: string[] } {
  const logs: NormalisedRoastLog[] = [];
  const errors: string[] = [];

  // Check required fields are mapped
  const mappedFields = new Set(Object.values(mapping));
  if (!mappedFields.has("roast_profile")) {
    errors.push("Roast Profile field is not mapped");
    return { logs, errors };
  }
  if (!mappedFields.has("roast_date")) {
    errors.push("Roast Date field is not mapped");
    return { logs, errors };
  }
  if (!mappedFields.has("green_weight_kg")) {
    errors.push("Green Weight field is not mapped");
    return { logs, errors };
  }
  if (!mappedFields.has("roasted_weight_kg")) {
    errors.push("Roasted Weight field is not mapped");
    return { logs, errors };
  }

  // Track last valid date for carry-forward (some exports leave date blank on repeat rows)
  let lastValidDate: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const profile = getMapped(row, mapping, "roast_profile");
    if (!profile) {
      errors.push(`Row ${rowNum}: Missing roast profile, skipped`);
      continue;
    }

    let dateStr = parseDateToISO(getMapped(row, mapping, "roast_date"));
    // Carry-forward: if date cell is empty/invalid, use last valid date
    if (!dateStr && lastValidDate) {
      dateStr = lastValidDate;
    }
    if (!dateStr) {
      errors.push(`Row ${rowNum}: Invalid or missing roast date, skipped`);
      continue;
    }
    lastValidDate = dateStr;

    const greenKg = parseWeightKg(getMapped(row, mapping, "green_weight_kg"));
    if (!greenKg || greenKg <= 0) {
      errors.push(`Row ${rowNum}: Invalid or missing green weight, skipped`);
      continue;
    }

    const roastedKg = parseWeightKg(getMapped(row, mapping, "roasted_weight_kg"));
    if (!roastedKg || roastedKg <= 0) {
      errors.push(`Row ${rowNum}: Invalid or missing roasted weight, skipped`);
      continue;
    }

    logs.push({
      roast_profile: profile,
      roast_date: dateStr,
      green_weight_kg: greenKg,
      roasted_weight_kg: roastedKg,
      batch_number: getMapped(row, mapping, "batch_number") || null,
      green_lots: getMapped(row, mapping, "green_lots") || null,
      duration_seconds: parseTimeToSeconds(getMapped(row, mapping, "duration")),
      charge_temp_c: parseNum(getMapped(row, mapping, "charge_temp_c")),
      drop_temp_c: parseNum(getMapped(row, mapping, "drop_temp_c")),
      dev_time_seconds: parseTimeToSeconds(getMapped(row, mapping, "dev_time")),
      first_crack_seconds: parseTimeToSeconds(getMapped(row, mapping, "first_crack")),
      machine: getMapped(row, mapping, "machine") || null,
      operator: getMapped(row, mapping, "operator") || null,
      notes: getMapped(row, mapping, "notes") || null,
    });
  }

  return { logs, errors };
}
