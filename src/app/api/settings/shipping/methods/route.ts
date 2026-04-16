import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: methods, error } = await supabase
    .from("shipping_methods")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Shipping methods fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping methods" },
      { status: 500 }
    );
  }

  return NextResponse.json({ methods: methods || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, price, free_threshold, estimated_days, is_active, max_weight_kg } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Method name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get next sort_order
    const { data: existing } = await supabase
      .from("shipping_methods")
      .select("sort_order")
      .eq("roaster_id", roaster.id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("shipping_methods")
      .insert({
        roaster_id: roaster.id,
        name: name.trim(),
        price: price ?? 0,
        free_threshold: free_threshold || null,
        estimated_days: estimated_days || null,
        is_active: is_active ?? true,
        sort_order: nextOrder,
        max_weight_kg: max_weight_kg != null ? parseFloat(max_weight_kg) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Shipping method create error:", error);
      return NextResponse.json(
        { error: "Failed to create shipping method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ method: data });
  } catch (error) {
    console.error("Shipping method create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
