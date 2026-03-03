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
      .from("pricing_tier_brackets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (body.min_quantity !== undefined && body.min_quantity !== current.min_quantity) {
      if (body.min_quantity < 1) {
        return NextResponse.json({ error: "min_quantity must be > 0" }, { status: 400 });
      }
      updates.min_quantity = body.min_quantity;
      changes.push({ field: "min_quantity", oldValue: String(current.min_quantity), newValue: String(body.min_quantity) });
    }

    if (body.max_quantity !== undefined && body.max_quantity !== current.max_quantity) {
      const newMin = updates.min_quantity as number ?? current.min_quantity;
      if (body.max_quantity < newMin) {
        return NextResponse.json({ error: "max_quantity must be >= min_quantity" }, { status: 400 });
      }
      updates.max_quantity = body.max_quantity;
      changes.push({ field: "max_quantity", oldValue: String(current.max_quantity), newValue: String(body.max_quantity) });
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
      .from("pricing_tier_brackets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Bracket update error:", updateError);
      return NextResponse.json({ error: "Failed to update bracket" }, { status: 500 });
    }

    if (changes.length > 0) {
      await supabase.from("pricing_change_history").insert(
        changes.map((c) => ({
          record_type: "bracket",
          record_id: id,
          field_changed: c.field,
          old_value: c.oldValue,
          new_value: c.newValue,
          changed_by: user.id,
        }))
      );
    }

    return NextResponse.json({ bracket: updated });
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

    // Soft-delete: deactivate bracket
    const { error } = await supabase
      .from("pricing_tier_brackets")
      .update({ is_active: false, updated_by: user.id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to deactivate bracket" }, { status: 500 });
    }

    // Also deactivate all prices for this bracket
    await supabase
      .from("pricing_tier_prices")
      .update({ is_active: false, updated_by: user.id })
      .eq("bracket_id", id)
      .eq("is_active", true);

    await supabase.from("pricing_change_history").insert({
      record_type: "bracket",
      record_id: id,
      field_changed: "deleted",
      old_value: "active",
      new_value: "deleted",
      changed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
