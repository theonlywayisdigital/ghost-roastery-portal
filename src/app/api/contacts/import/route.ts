import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import { findOrCreatePerson } from "@/lib/people";
import {
  csvToNormalisedContacts,
  csvToNormalisedBusinesses,
  type ContactField,
  type BusinessField,
  type ContactsImportResult,
} from "@/lib/contacts-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { csvText, mapping, type, businessMappings } = body as {
    csvText: string;
    mapping: Record<string, string>;
    type: "contacts" | "businesses";
    businessMappings?: Record<string, string>;
  };

  if (!csvText || !mapping || !type) {
    return NextResponse.json(
      { error: "csvText, mapping, and type are required" },
      { status: 400 }
    );
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  if (type === "contacts") {
    return handleContacts(
      supabase,
      roasterId,
      csvText,
      mapping as Record<string, ContactField>,
      businessMappings
    );
  } else if (type === "businesses") {
    return handleBusinesses(
      supabase,
      roasterId,
      csvText,
      mapping as Record<string, BusinessField>
    );
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// ─── Contacts Import ─────────────────────────────────────────

async function handleContacts(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  csvText: string,
  mapping: Record<string, ContactField>,
  businessMappings?: Record<string, string>
) {
  const { contacts, errors: parseErrors } = csvToNormalisedContacts({
    csvText,
    mapping,
  });

  if (contacts.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: 0,
      errors: parseErrors.length > 0 ? parseErrors : ["No contacts found in CSV"],
      total: 0,
    } satisfies ContactsImportResult);
  }

  // Check limit
  const limitCheck = await checkLimit(roasterId, "crmContacts", contacts.length);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, upgrade_required: true },
      { status: 403 }
    );
  }

  // Get existing contact emails for dedup
  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("email")
    .eq("roaster_id", roasterId)
    .not("email", "is", null);

  const existingEmails = new Set(
    (existingContacts || []).map((c: { email: string }) =>
      c.email.toLowerCase()
    )
  );

  // Resolve business mappings: normalised name → business_id
  const businessIdCache = new Map<string, string | null>();

  // Build a map of normalised name → original casing from CSV data
  const originalNames = new Map<string, string>();
  for (const c of contacts) {
    if (c.business_name) {
      const key = c.business_name.toLowerCase().trim();
      if (!originalNames.has(key)) {
        originalNames.set(key, c.business_name);
      }
    }
  }

  if (businessMappings) {
    for (const [normalizedName, value] of Object.entries(businessMappings)) {
      if (value === "create") {
        // Use original casing from CSV, fall back to normalised name
        const displayName = originalNames.get(normalizedName) || normalizedName;
        const { data: newBiz } = await supabase
          .from("businesses")
          .insert({
            roaster_id: roasterId,
            name: displayName,
            source: "import",
            types: [],
            status: "active",
          })
          .select("id, name")
          .single();

        if (newBiz) {
          businessIdCache.set(normalizedName, newBiz.id);
        }
      } else if (value) {
        // Existing business ID
        businessIdCache.set(normalizedName, value);
      }
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  // Track emails we've imported in this batch to detect in-batch duplicates
  const batchEmails = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    try {
      // Email dedup
      if (contact.email) {
        if (existingEmails.has(contact.email) || batchEmails.has(contact.email)) {
          errors.push(
            `Row ${i + 2}: Duplicate email "${contact.email}" — skipped`
          );
          skipped++;
          continue;
        }
        batchEmails.add(contact.email);
      }

      // Resolve business_id
      let businessId: string | null = null;
      if (contact.business_name) {
        const key = contact.business_name.toLowerCase().trim();
        if (businessIdCache.has(key)) {
          businessId = businessIdCache.get(key) || null;
        }
      }

      // Find or create person
      const peopleId = await findOrCreatePerson(
        supabase,
        contact.email,
        contact.first_name,
        contact.last_name,
        contact.phone
      );

      // Insert contact
      const { data: newContact, error } = await supabase.from("contacts").insert({
        roaster_id: roasterId,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        business_id: businessId,
        business_name: contact.business_name,
        role: contact.role,
        types: contact.types,
        address_line_1: contact.address_line_1,
        address_line_2: contact.address_line_2,
        city: contact.city,
        county: contact.county,
        postcode: contact.postcode,
        country: contact.country,
        source: "import",
        status: "active",
        people_id: peopleId,
        owner_id: roasterId,
      }).select("id").single();

      // If notes text was provided, insert as a contact_note
      if (newContact && contact.notes) {
        await supabase.from("contact_notes").insert({
          contact_id: newContact.id,
          content: contact.notes,
        });
      }

      if (error) {
        console.error(`[contacts-import] Supabase error:`, JSON.stringify(error));
        throw error;
      }
      imported++;
    } catch (err: unknown) {
      const name =
        [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
        contact.email ||
        `Row ${i + 2}`;
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Unknown error";
      console.error(`[contacts-import] Failed to import "${name}":`, err);
      errors.push(`${name}: ${errMsg}`);
      skipped++;
    }
  }

  const result: ContactsImportResult = {
    imported,
    skipped,
    errors,
    total: contacts.length,
  };

  return NextResponse.json(result);
}

// ─── Businesses Import ───────────────────────────────────────

async function handleBusinesses(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  csvText: string,
  mapping: Record<string, BusinessField>
) {
  const { businesses, errors: parseErrors } = csvToNormalisedBusinesses({
    csvText,
    mapping,
  });

  if (businesses.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: 0,
      errors:
        parseErrors.length > 0 ? parseErrors : ["No businesses found in CSV"],
      total: 0,
    } satisfies ContactsImportResult);
  }

  // Get existing business names for dedup
  const { data: existingBiz } = await supabase
    .from("businesses")
    .select("name")
    .eq("roaster_id", roasterId);

  const existingNames = new Set(
    (existingBiz || []).map((b: { name: string }) =>
      b.name.toLowerCase().trim()
    )
  );

  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];
  const batchNames = new Set<string>();

  for (let i = 0; i < businesses.length; i++) {
    const biz = businesses[i];
    const nameKey = biz.name.toLowerCase().trim();

    try {
      // Name dedup
      if (existingNames.has(nameKey) || batchNames.has(nameKey)) {
        errors.push(
          `Row ${i + 2}: Duplicate business name "${biz.name}" — skipped`
        );
        skipped++;
        continue;
      }
      batchNames.add(nameKey);

      // Insert business
      const { data: newBiz, error } = await supabase
        .from("businesses")
        .insert({
          roaster_id: roasterId,
          name: biz.name,
          industry: biz.industry,
          types: biz.types,
          email: biz.email,
          phone: biz.phone,
          website: biz.website,
          address_line_1: biz.address_line_1,
          address_line_2: biz.address_line_2,
          city: biz.city,
          county: biz.county,
          postcode: biz.postcode,
          country: biz.country,
          notes: biz.notes,
          source: "import",
          status: "active",
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[contacts-import] Supabase biz error:`, JSON.stringify(error));
        throw error;
      }

      // Create linked contact if primary contact fields present
      if (
        newBiz &&
        (biz.contact_first_name || biz.contact_last_name || biz.contact_email)
      ) {
        const peopleId = await findOrCreatePerson(
          supabase,
          biz.contact_email,
          biz.contact_first_name || undefined,
          biz.contact_last_name || undefined,
          biz.contact_phone
        );

        await supabase.from("contacts").insert({
          roaster_id: roasterId,
          first_name: biz.contact_first_name || "",
          last_name: biz.contact_last_name || "",
          email: biz.contact_email,
          phone: biz.contact_phone,
          business_id: newBiz.id,
          business_name: biz.name,
          role: biz.contact_role,
          types: [],
          source: "import",
          status: "active",
          people_id: peopleId,
          owner_id: roasterId,
        });
      }

      imported++;
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Unknown error";
      console.error(
        `[contacts-import] Failed to import business "${biz.name}":`,
        err
      );
      errors.push(`${biz.name}: ${errMsg}`);
      skipped++;
    }
  }

  const result: ContactsImportResult = {
    imported,
    skipped,
    errors,
    total: businesses.length,
  };

  return NextResponse.json(result);
}
