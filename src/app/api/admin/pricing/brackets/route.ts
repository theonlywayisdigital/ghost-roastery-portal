import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("pricing_tier_brackets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch brackets" }, { status: 500 });
    }

    return NextResponse.json({ brackets: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { min_quantity, max_quantity } = body;

    if (!min_quantity || !max_quantity || min_quantity < 1 || max_quantity < min_quantity) {
      return NextResponse.json(
        { error: "min_quantity must be > 0 and max_quantity must be >= min_quantity" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for overlapping active brackets
    const { data: existing } = await supabase
      .from("pricing_tier_brackets")
      .select("id, min_quantity, max_quantity")
      .eq("is_active", true);

    const overlap = (existing || []).some(
      (b) => min_quantity <= b.max_quantity && max_quantity >= b.min_quantity
    );

    if (overlap) {
      return NextResponse.json(
        { error: "This bracket overlaps with an existing active bracket" },
        { status: 409 }
      );
    }

    // Auto-calculate sort_order
    const sortOrder = (existing || []).filter((b) => b.min_quantity < min_quantity).length + 1;

    const { data: bracket, error } = await supabase
      .from("pricing_tier_brackets")
      .insert({
        min_quantity,
        max_quantity,
        sort_order: sortOrder,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Bracket create error:", error);
      return NextResponse.json({ error: "Failed to create bracket" }, { status: 500 });
    }

    // Re-sort all active brackets
    const { data: allBrackets } = await supabase
      .from("pricing_tier_brackets")
      .select("id, min_quantity")
      .eq("is_active", true)
      .order("min_quantity", { ascending: true });

    if (allBrackets) {
      for (let i = 0; i < allBrackets.length; i++) {
        await supabase
          .from("pricing_tier_brackets")
          .update({ sort_order: i + 1 })
          .eq("id", allBrackets[i].id);
      }
    }

    // Log to history
    await supabase.from("pricing_change_history").insert({
      record_type: "bracket",
      record_id: bracket.id,
      field_changed: "created",
      old_value: null,
      new_value: `${min_quantity}-${max_quantity}`,
      changed_by: user.id,
    });

    return NextResponse.json({ bracket });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
