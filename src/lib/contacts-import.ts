// ═══════════════════════════════════════════════════════════════
// CSV → NormalisedContact / NormalisedBusiness parsing
// ═══════════════════════════════════════════════════════════════

import Papa from "papaparse";

// ─── Contact Field types ─────────────────────────────────────

export type ContactField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "business_name"
  | "role"
  | "types"
  | "address_line_1"
  | "address_line_2"
  | "city"
  | "county"
  | "postcode"
  | "country"
  | "notes"
  | "ignore";

export const CONTACT_FIELDS: {
  value: ContactField;
  label: string;
  group: string;
}[] = [
  { value: "first_name", label: "First Name", group: "Person" },
  { value: "last_name", label: "Last Name", group: "Person" },
  { value: "email", label: "Email", group: "Person" },
  { value: "phone", label: "Phone", group: "Person" },
  { value: "role", label: "Role", group: "Person" },
  { value: "business_name", label: "Business Name", group: "Business" },
  { value: "address_line_1", label: "Address Line 1", group: "Address" },
  { value: "address_line_2", label: "Address Line 2", group: "Address" },
  { value: "city", label: "City", group: "Address" },
  { value: "county", label: "County", group: "Address" },
  { value: "postcode", label: "Postcode", group: "Address" },
  { value: "country", label: "Country", group: "Address" },
  { value: "types", label: "Types", group: "Other" },
  { value: "notes", label: "Notes", group: "Other" },
  { value: "ignore", label: "— Ignore —", group: "Other" },
];

// ─── Business Field types ────────────────────────────────────

export type BusinessField =
  | "name"
  | "industry"
  | "types"
  | "email"
  | "phone"
  | "website"
  | "address_line_1"
  | "address_line_2"
  | "city"
  | "county"
  | "postcode"
  | "country"
  | "notes"
  | "contact_first_name"
  | "contact_last_name"
  | "contact_email"
  | "contact_phone"
  | "contact_role"
  | "ignore";

export const BUSINESS_FIELDS: {
  value: BusinessField;
  label: string;
  group: string;
}[] = [
  { value: "name", label: "Business Name", group: "Identity" },
  { value: "industry", label: "Industry", group: "Identity" },
  { value: "email", label: "Business Email", group: "Contact Info" },
  { value: "phone", label: "Business Phone", group: "Contact Info" },
  { value: "website", label: "Website", group: "Contact Info" },
  { value: "address_line_1", label: "Address Line 1", group: "Address" },
  { value: "address_line_2", label: "Address Line 2", group: "Address" },
  { value: "city", label: "City", group: "Address" },
  { value: "county", label: "County", group: "Address" },
  { value: "postcode", label: "Postcode", group: "Address" },
  { value: "country", label: "Country", group: "Address" },
  { value: "contact_first_name", label: "Contact First Name", group: "Primary Contact" },
  { value: "contact_last_name", label: "Contact Last Name", group: "Primary Contact" },
  { value: "contact_email", label: "Contact Email", group: "Primary Contact" },
  { value: "contact_phone", label: "Contact Phone", group: "Primary Contact" },
  { value: "contact_role", label: "Contact Role", group: "Primary Contact" },
  { value: "types", label: "Types", group: "Other" },
  { value: "notes", label: "Notes", group: "Other" },
  { value: "ignore", label: "— Ignore —", group: "Other" },
];

// ─── Auto-mapping ────────────────────────────────────────────

const CONTACT_HEADER_ALIASES: Record<string, ContactField> = {
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
  "company": "business_name",
  "company name": "business_name",
  "organisation": "business_name",
  "organization": "business_name",
  "role": "role",
  "job title": "role",
  "position": "role",
  "title": "role",
  "types": "types",
  "type": "types",
  "category": "types",
  "address": "address_line_1",
  "address line 1": "address_line_1",
  "address_line_1": "address_line_1",
  "street": "address_line_1",
  "address line 2": "address_line_2",
  "address_line_2": "address_line_2",
  "city": "city",
  "town": "city",
  "county": "county",
  "state": "county",
  "region": "county",
  "postcode": "postcode",
  "post code": "postcode",
  "zip": "postcode",
  "zip code": "postcode",
  "postal code": "postcode",
  "country": "country",
  "notes": "notes",
  "note": "notes",
  "comments": "notes",
};

const BUSINESS_HEADER_ALIASES: Record<string, BusinessField> = {
  "name": "name",
  "business name": "name",
  "business_name": "name",
  "company": "name",
  "company name": "name",
  "organisation": "name",
  "organization": "name",
  "industry": "industry",
  "sector": "industry",
  "email": "email",
  "email address": "email",
  "business email": "email",
  "phone": "phone",
  "phone number": "phone",
  "business phone": "phone",
  "telephone": "phone",
  "website": "website",
  "web": "website",
  "url": "website",
  "address": "address_line_1",
  "address line 1": "address_line_1",
  "street": "address_line_1",
  "address line 2": "address_line_2",
  "city": "city",
  "town": "city",
  "county": "county",
  "state": "county",
  "region": "county",
  "postcode": "postcode",
  "post code": "postcode",
  "zip": "postcode",
  "zip code": "postcode",
  "postal code": "postcode",
  "country": "country",
  "contact first name": "contact_first_name",
  "contact_first_name": "contact_first_name",
  "contact last name": "contact_last_name",
  "contact_last_name": "contact_last_name",
  "contact name": "contact_first_name",
  "contact email": "contact_email",
  "contact_email": "contact_email",
  "contact phone": "contact_phone",
  "contact_phone": "contact_phone",
  "contact role": "contact_role",
  "contact_role": "contact_role",
  "contact job title": "contact_role",
  "types": "types",
  "type": "types",
  "category": "types",
  "notes": "notes",
  "note": "notes",
};

export function autoMapContactHeaders(
  csvHeaders: string[]
): Record<string, ContactField> {
  const mapping: Record<string, ContactField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (CONTACT_HEADER_ALIASES[key]) {
      mapping[header] = CONTACT_HEADER_ALIASES[key];
    }
  }
  return mapping;
}

export function autoMapBusinessHeaders(
  csvHeaders: string[]
): Record<string, BusinessField> {
  const mapping: Record<string, BusinessField> = {};
  for (const header of csvHeaders) {
    const key = header.toLowerCase().trim();
    if (BUSINESS_HEADER_ALIASES[key]) {
      mapping[header] = BUSINESS_HEADER_ALIASES[key];
    }
  }
  return mapping;
}

// ─── Normalised interfaces ───────────────────────────────────

export interface NormalisedContact {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  role: string | null;
  types: string[];
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  notes: string | null;
}

export interface NormalisedBusiness {
  name: string;
  industry: string | null;
  types: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  notes: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
}

export interface ContactsImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────

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

function parseCommaSeparated(val: string | undefined): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ─── CSV → NormalisedContact[] ───────────────────────────────

export function csvToNormalisedContacts(input: {
  csvText: string;
  mapping: Record<string, ContactField>;
}): { contacts: NormalisedContact[]; errors: string[] } {
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
    return { contacts: [], errors };
  }

  const hasFirstName = Object.values(mapping).includes("first_name");
  const hasLastName = Object.values(mapping).includes("last_name");
  const hasEmail = Object.values(mapping).includes("email");

  if (!hasFirstName && !hasLastName && !hasEmail) {
    errors.push(
      'At least one of "First Name", "Last Name", or "Email" must be mapped'
    );
    return { contacts: [], errors };
  }

  const contacts: NormalisedContact[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const firstName = getMapped(row, mapping, "first_name") || "";
    const lastName = getMapped(row, mapping, "last_name") || "";
    const email = getMapped(row, mapping, "email") || null;

    if (!firstName && !lastName && !email) {
      errors.push(`Row ${i + 2}: No name or email found, skipped`);
      continue;
    }

    contacts.push({
      first_name: firstName,
      last_name: lastName,
      email: email?.toLowerCase() || null,
      phone: getMapped(row, mapping, "phone") || null,
      business_name: getMapped(row, mapping, "business_name") || null,
      role: getMapped(row, mapping, "role") || null,
      types: parseCommaSeparated(getMapped(row, mapping, "types")),
      address_line_1: getMapped(row, mapping, "address_line_1") || null,
      address_line_2: getMapped(row, mapping, "address_line_2") || null,
      city: getMapped(row, mapping, "city") || null,
      county: getMapped(row, mapping, "county") || null,
      postcode: getMapped(row, mapping, "postcode") || null,
      country: getMapped(row, mapping, "country") || null,
      notes: getMapped(row, mapping, "notes") || null,
    });
  }

  return { contacts, errors };
}

// ─── CSV → NormalisedBusiness[] ──────────────────────────────

export function csvToNormalisedBusinesses(input: {
  csvText: string;
  mapping: Record<string, BusinessField>;
}): { businesses: NormalisedBusiness[]; errors: string[] } {
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
    return { businesses: [], errors };
  }

  const hasName = Object.values(mapping).includes("name");
  if (!hasName) {
    errors.push('No column mapped to "Business Name" — this field is required');
    return { businesses: [], errors };
  }

  const businesses: NormalisedBusiness[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const name = getMapped(row, mapping, "name");

    if (!name) {
      errors.push(`Row ${i + 2}: Missing business name, skipped`);
      continue;
    }

    businesses.push({
      name,
      industry: getMapped(row, mapping, "industry") || null,
      types: parseCommaSeparated(getMapped(row, mapping, "types")),
      email: getMapped(row, mapping, "email")?.toLowerCase() || null,
      phone: getMapped(row, mapping, "phone") || null,
      website: getMapped(row, mapping, "website") || null,
      address_line_1: getMapped(row, mapping, "address_line_1") || null,
      address_line_2: getMapped(row, mapping, "address_line_2") || null,
      city: getMapped(row, mapping, "city") || null,
      county: getMapped(row, mapping, "county") || null,
      postcode: getMapped(row, mapping, "postcode") || null,
      country: getMapped(row, mapping, "country") || null,
      notes: getMapped(row, mapping, "notes") || null,
      contact_first_name: getMapped(row, mapping, "contact_first_name") || null,
      contact_last_name: getMapped(row, mapping, "contact_last_name") || null,
      contact_email: getMapped(row, mapping, "contact_email")?.toLowerCase() || null,
      contact_phone: getMapped(row, mapping, "contact_phone") || null,
      contact_role: getMapped(row, mapping, "contact_role") || null,
    });
  }

  return { businesses, errors };
}
