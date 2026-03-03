import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    const { data: current, error: fetchError } = await supabase
      .from("pricing_tier_prices")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (body.price_per_bag !== undefined && Number(body.price_per_bag) !== Number(current.price_per_bag)) {
      if (Number(body.price_per_bag) < 0) {
        return NextResponse.json({ error: "price_per_bag must be non-negative" }, { status: 400 });
      }
      updates.price_per_bag = Number(body.price_per_bag);
      changes.push({ field: "price_per_bag", oldValue: String(current.price_per_bag), newValue: String(body.price_per_bag) });
    }

    if (body.shipping_cost !== undefined && Number(body.shipping_cost) !== Number(current.shipping_cost)) {
      updates.shipping_cost = Number(body.shipping_cost);
      changes.push({ field: "shipping_cost", oldValue: String(current.shipping_cost), newValue: String(body.shipping_cost) });
    }

    if (body.is_active !== undefined && body.is_active !== current.is_active) {
      updates.is_active = body.is_active;
      changes.push({ field: "is_active", oldValue: String(current.is_active), newValue: String(body.is_active) });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    updates.updated_by = user.id;

    const { data: updated, error: updateError } = await supabase
      .from("pricing_tier_prices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Price update error:", updateError);
      return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
    }

    if (changes.length > 0) {
      await supabase.from("pricing_change_history").insert(
        changes.map((c) => ({
          record_type: "price",
          record_id: id,
          field_changed: c.field,
          old_value: c.oldValue,
          new_value: c.newValue,
          changed_by: user.id,
        }))
      );
    }

    return NextResponse.json({ price: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: current } = await supabase
      .from("pricing_tier_prices")
      .select("*")
      .eq("id", id)
      .single();

    if (!current) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("pricing_tier_prices")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate price" }, { status: 500 });
    }

    await supabase.from("pricing_change_history").insert({
      record_type: "price",
      record_id: id,
      field_changed: "deleted",
      old_value: `${current.bag_size} @ £${current.price_per_bag}`,
      new_value: null,
      changed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
