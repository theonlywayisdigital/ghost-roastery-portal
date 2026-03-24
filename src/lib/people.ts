import { createServerClient } from "@/lib/supabase";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Find or create a person in the people table.
 * Calls the database function find_or_create_person which handles
 * email normalization, deduplication, and race conditions.
 */
export async function findOrCreatePerson(
  supabase: SupabaseClient,
  email: string | null | undefined,
  firstName?: string,
  lastName?: string,
  phone?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("find_or_create_person", {
      p_email: email || null,
      p_first_name: firstName || "",
      p_last_name: lastName || "",
      p_phone: phone || null,
    });

    if (error) {
      console.error("find_or_create_person error:", error);
      return null;
    }

    return data as string | null;
  } catch (err) {
    console.error("findOrCreatePerson exception:", err);
    return null;
  }
}

interface DeliveryAddress {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

/**
 * Find or create a contact in the contacts table.
 * Looks up by email (lowercased) + roaster_id.
 * If not found, creates a new contact with source: "order".
 * Optionally populates address fields from delivery_address when creating.
 * Handles unique constraint race condition (23505) by retrying lookup.
 */
export async function findOrCreateContact(
  supabase: SupabaseClient,
  roasterId: string,
  email: string | null | undefined,
  firstName?: string,
  lastName?: string,
  deliveryAddress?: DeliveryAddress | null
): Promise<string | null> {
  if (!email || !roasterId) return null;

  const normalizedEmail = email.toLowerCase();

  try {
    // 1. Try to find existing contact
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("roaster_id", roasterId)
      .maybeSingle();

    if (existing) return existing.id;

    // 2. Create new contact (with address from delivery_address if available)
    const addr = deliveryAddress || {};
    const { data: created, error: createError } = await supabase
      .from("contacts")
      .insert({
        roaster_id: roasterId,
        email: normalizedEmail,
        first_name: firstName || "",
        last_name: lastName || "",
        source: "order",
        status: "active",
        contact_type: "customer",
        types: ["retail"],
        ...(addr.address_line_1 ? { address_line_1: addr.address_line_1 } : {}),
        ...(addr.address_line_2 ? { address_line_2: addr.address_line_2 } : {}),
        ...(addr.city ? { city: addr.city } : {}),
        ...(addr.county ? { county: addr.county } : {}),
        ...(addr.postcode ? { postcode: addr.postcode } : {}),
        ...(addr.country ? { country: addr.country } : {}),
      })
      .select("id")
      .single();

    if (created) return created.id;

    // 3. Handle unique constraint race condition
    if (createError?.code === "23505") {
      const { data: retry } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", normalizedEmail)
        .eq("roaster_id", roasterId)
        .maybeSingle();

      return retry?.id || null;
    }

    console.error("findOrCreateContact error:", createError);
    return null;
  } catch (err) {
    console.error("findOrCreateContact exception:", err);
    return null;
  }
}

/**
 * Resolve the primary contact type from a types array.
 * Priority: wholesale > retail > supplier > lead > partner > roaster > prospect
 */
export function resolvePrimaryContactType(types: string[]): string {
  const priority = [
    "wholesale",
    "retail",
    "supplier",
    "lead",
    "partner",
    "roaster",
    "prospect",
  ];
  for (const type of priority) {
    if (types.includes(type)) return type;
  }
  return "retail";
}

/**
 * Conditionally update a person record if any fields have changed.
 * Only updates fields that are currently empty/null on the person.
 */
export async function updatePersonIfNeeded(
  supabase: SupabaseClient,
  peopleId: string,
  newValues: { first_name?: string; last_name?: string; phone?: string | null; email?: string | null },
  oldValues: { first_name?: string; last_name?: string; phone?: string | null; email?: string | null }
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (newValues.first_name && newValues.first_name !== oldValues.first_name) {
    updates.first_name = newValues.first_name;
  }
  if (newValues.last_name && newValues.last_name !== oldValues.last_name) {
    updates.last_name = newValues.last_name;
  }
  if (newValues.phone && newValues.phone !== oldValues.phone) {
    updates.phone = newValues.phone;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("people").update(updates).eq("id", peopleId);
  }
}
