import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roasterId: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roasterId } = await params;
    const body = await request.json();
    const { bracket_id, bag_size, rate_per_bag, currency, notes } = body;

    if (!bracket_id || !bag_size) {
      return NextResponse.json({ error: "bracket_id and bag_size are required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if rate exists for this partner + bracket + bag size
    const { data: existing } = await supabase
      .from("partner_rates")
      .select("*")
      .eq("roaster_id", roasterId)
      .eq("bracket_id", bracket_id)
      .eq("bag_size", bag_size)
      .eq("is_active", true)
      .single();

    if (existing) {
      // Update existing rate
      const updates: Record<string, unknown> = {};
      const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

      if (rate_per_bag !== undefined && Number(rate_per_bag) !== Number(existing.rate_per_bag)) {
        const val = Number(rate_per_bag);
        if (isNaN(val) || val < 0) {
          return NextResponse.json({ error: "rate_per_bag must be a non-negative number" }, { status: 400 });
        }
        updates.rate_per_bag = val;
        changes.push({ field: "rate_per_bag", oldValue: String(existing.rate_per_bag), newValue: String(val) });
      }

      if (currency && currency !== existing.currency) {
        updates.currency = currency;
        changes.push({ field: "currency", oldValue: existing.currency, newValue: currency });
      }

      if (notes !== undefined && notes !== existing.notes) {
        updates.notes = notes;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No changes provided" }, { status: 400 });
      }

      updates.negotiated_at = new Date().toISOString();
      updates.negotiated_by = user.id;

      const { data: updated, error: updateError } = await supabase
        .from("partner_rates")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Rate update error:", updateError);
        return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
      }

      // Log changes to unified history
      if (changes.length > 0) {
        await supabase.from("pricing_change_history").insert(
          changes.map((c) => ({
            record_type: "partner_rate",
            record_id: existing.id,
            field_changed: c.field,
            old_value: c.oldValue,
            new_value: c.newValue,
            changed_by: user.id,
          }))
        );
      }

      return NextResponse.json({ rate: updated });
    } else {
      // Create new rate
      if (rate_per_bag === undefined || rate_per_bag === null || Number(rate_per_bag) < 0) {
        return NextResponse.json({ error: "rate_per_bag is required and must be non-negative" }, { status: 400 });
      }

      const { data: created, error: createError } = await supabase
        .from("partner_rates")
        .insert({
          roaster_id: roasterId,
          bracket_id,
          bag_size,
          rate_per_bag: Number(rate_per_bag),
          currency: currency || "GBP",
          negotiated_by: user.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (createError) {
        console.error("Rate create error:", createError);
        return NextResponse.json({ error: "Failed to create rate" }, { status: 500 });
      }

      return NextResponse.json({ rate: created });
    }
  } catch (error) {
    console.error("Partner rates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
