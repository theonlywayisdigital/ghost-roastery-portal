import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

// Determine invoice owner context based on user roles
export function getInvoiceOwner(user: {
  roles: string[];
  roaster?: { id: string } | null;
}) {
  if (user.roles.includes("admin")) {
    return { owner_type: "ghost_roastery" as const, roaster_id: null };
  }
  if (user.roles.includes("roaster") && user.roaster?.id) {
    return { owner_type: "roaster" as const, roaster_id: user.roaster.id };
  }
  return null;
}

// Generate next invoice number
export async function generateInvoiceNumber(
  supabase: ReturnType<typeof createServerClient>,
  ownerType: "ghost_roastery" | "roaster",
  roasterId: string | null,
  prefix?: string
): Promise<string> {
  // Get sequence row
  const query = roasterId
    ? supabase
        .from("invoice_sequences")
        .select("*")
        .eq("roaster_id", roasterId)
        .single()
    : supabase
        .from("invoice_sequences")
        .select("*")
        .is("roaster_id", null)
        .single();

  const { data: seq, error } = await query;

  if (error || !seq) {
    // Create sequence row if missing
    await supabase.from("invoice_sequences").insert({
      roaster_id: roasterId,
      last_number: 0,
    });
    return generateInvoiceNumber(supabase, ownerType, roasterId, prefix);
  }

  const nextNumber = seq.last_number + 1;

  // Update sequence
  if (roasterId) {
    await supabase
      .from("invoice_sequences")
      .update({ last_number: nextNumber })
      .eq("roaster_id", roasterId);
  } else {
    await supabase
      .from("invoice_sequences")
      .update({ last_number: nextNumber })
      .is("roaster_id", null);
  }

  // Get prefix
  let invoicePrefix = prefix || "INV-";
  if (!prefix) {
    if (ownerType === "ghost_roastery") {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("invoice_prefix")
        .limit(1)
        .single();
      invoicePrefix = settings?.invoice_prefix || "GR-INV-";
    } else if (roasterId) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("invoice_prefix")
        .eq("id", roasterId)
        .single();
      invoicePrefix = roaster?.invoice_prefix || "INV-";
    }
  }

  return `${invoicePrefix}${String(nextNumber).padStart(4, "0")}`;
}

// Generate a unique access token for public invoice view
export function generateAccessToken(): string {
  return crypto.randomUUID();
}
