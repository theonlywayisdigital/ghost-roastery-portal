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

/**
 * Resolve the primary contact type from a types array.
 * Priority: wholesale > customer > supplier > lead > partner > roaster > prospect
 */
export function resolvePrimaryContactType(types: string[]): string {
  const priority = [
    "wholesale",
    "customer",
    "supplier",
    "lead",
    "partner",
    "roaster",
    "prospect",
  ];
  for (const type of priority) {
    if (types.includes(type)) return type;
  }
  return "customer";
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
