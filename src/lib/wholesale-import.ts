// ═══════════════════════════════════════════════════════════════
// CSV → NormalisedWholesaleBuyer parsing
// ═══════════════════════════════════════════════════════════════

import Papa from "papaparse";

// ─── Wholesale Field types ──────────────────────────────────

export type WholesaleField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "business_name"
  | "business_type"
  | "business_address"
  | "business_website"
  | "vat_number"
  | "monthly_volume"
  | "payment_terms"
  | "notes"
  | "ignore";

export const WHOLESALE_FIELDS: {
  value: WholesaleField;
  label: string;
  group: string;
}[] = [
  { value: "first_name", label: "First Name", group: "Contact" },
  { value: "last_name", label: "Last Name", group: "Contact" },
  { value: "email", label: "Email", group: "Contact" },
  { value: "phone", label: "Phone", group: "Contact" },
  { value: "business_name", label: "Business Name", group: "Business" },
  { value: "business_type", label: "Business Type", group: "Business" },
  { value: "business_address", label: "Business Address", group: "Business" },
  { value: "business_website", label: "Website", group: "Business" },
  { value: "vat_number", label: "VAT Number", group: "Business" },
  { value: "monthly_volume", label: "Monthly Volume", group: "Business" },
  { value: "payment_terms", label: "Payment Terms", group: "Wholesale" },
  { value: "notes", label: "Notes", group: "Wholesale" },
  { value: "ignore", label: "— Ignore —", group: "Other" },
];

// ─── Auto-mapping ───────────────────────────────────────────

const WHOLESALE_HEADER_ALIASES: Record<string, WholesaleField> = {
  "first name": "first_name",
  "first_name": "first_name",
  "given name": "first_name",
  "forename": "first_name",
  "last name": "last_name",
  "last_name": "last_name",
  "surname": "last_name",
  "family name": "last_name",
  "email": "email",
  "email address": "email",
  "e-mail": "email",
  "phone": "phone",
  "phone number": "phone",
  "telephone": "phone",
  "mobile": "phone",
  "cell": "phone",
  "business": "business_name",
  "business name": "business_name",
  "business_name": "business_name",
  "company": "business_name",
  "company name": "business_name",
  "organisation": "business_name",
  "organization": "business_name",
  "business type": "business_type",
  "business_type": "business_type",
  "type": "business_type",
  "industry": "business_type",
  "sector": "business_type",
  "business address": "business_address",
  "business_address": "business_address",
  "address": "business_address",
  "website": "business_website",
  "business_website": "business_website",
  "web": "business_website",
  "url": "business_website",
  "vat": "vat_number",
  "vat number": "vat_number",
  "vat_number": "vat_number",
  "tax number": "vat_number",
  "tax id": "vat_number",
  "monthly volume": "monthly_volume",
  "monthly_volume": "monthly_volume",
  "volume": "monthly_volume",
  "terms": "payment_terms",
  "payment terms": "payment_terms",
  "payment_terms": "payment_terms",
  "notes": "notes",
  "note": "notes",
  "comments": "notes",
};

export function autoMapWholesaleHeaders(
  csvHeaders: string[]
): Record<string, WholesaleField> {
  const mapping: Record<string, WholesaleField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (WHOLESALE_HEADER_ALIASES[key]) {
      mapping[header] = WHOLESALE_HEADER_ALIASES[key];
    }
  }
  return mapping;
}

// ─── Normalised interface ───────────────────────────────────

export interface NormalisedWholesaleBuyer {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  business_name: string;
  business_type: string | null;
  business_address: string | null;
  business_website: string | null;
  vat_number: string | null;
  monthly_volume: string | null;
  payment_terms: string | null;
  notes: string | null;
}

export interface WholesaleImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
  emailsFailed: number;
}

// ─── Helpers ────────────────────────────────────────────────

function getMapped(
  row: Record<string, string>,
  mapping: Record<string, WholesaleField>,
  field: WholesaleField
): string | undefined {
  for (const [csvCol, mappedField] of Object.entries(mapping)) {
    if (mappedField === field && row[csvCol] !== undefined) {
      const val = row[csvCol]?.trim();
      if (val) return val;
    }
  }
  return undefined;
}

// ─── CSV → NormalisedWholesaleBuyer[] ───────────────────────

export function csvToNormalisedWholesaleBuyers(input: {
  csvText: string;
  mapping: Record<string, WholesaleField>;
}): { buyers: NormalisedWholesaleBuyer[]; errors: string[] } {
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
    return { buyers: [], errors };
  }

  const hasEmail = Object.values(mapping).includes("email");
  const hasFirstName = Object.values(mapping).includes("first_name");
  const hasLastName = Object.values(mapping).includes("last_name");
  const hasBusinessName = Object.values(mapping).includes("business_name");

  if (!hasEmail) {
    errors.push('"Email" must be mapped');
    return { buyers: [], errors };
  }

  if (!hasFirstName && !hasLastName) {
    errors.push('At least one of "First Name" or "Last Name" must be mapped');
    return { buyers: [], errors };
  }

  if (!hasBusinessName) {
    errors.push('"Business Name" must be mapped');
    return { buyers: [], errors };
  }

  const buyers: NormalisedWholesaleBuyer[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const firstName = getMapped(row, mapping, "first_name") || "";
    const lastName = getMapped(row, mapping, "last_name") || "";
    const email = getMapped(row, mapping, "email");
    const businessName = getMapped(row, mapping, "business_name");

    if (!email) {
      errors.push(`Row ${i + 2}: Missing email, skipped`);
      continue;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 2}: Invalid email "${email}", skipped`);
      continue;
    }

    if (!firstName && !lastName) {
      errors.push(`Row ${i + 2}: Missing name, skipped`);
      continue;
    }

    if (!businessName) {
      errors.push(`Row ${i + 2}: Missing business name, skipped`);
      continue;
    }

    buyers.push({
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: getMapped(row, mapping, "phone") || null,
      business_name: businessName,
      business_type: getMapped(row, mapping, "business_type") || null,
      business_address: getMapped(row, mapping, "business_address") || null,
      business_website: getMapped(row, mapping, "business_website") || null,
      vat_number: getMapped(row, mapping, "vat_number") || null,
      monthly_volume: getMapped(row, mapping, "monthly_volume") || null,
      payment_terms: getMapped(row, mapping, "payment_terms") || null,
      notes: getMapped(row, mapping, "notes") || null,
    });
  }

  return { buyers, errors };
}
