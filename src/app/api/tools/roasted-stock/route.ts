import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roasted_stock")
    .select("*, green_beans(name)")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch roasted stock" }, { status: 500 });
  return NextResponse.json({ roastedStock: data });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(roaster.id as string, "roastedStock", 1);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message, upgrade_required: true }, { status: 403 });
  }

  const body = await request.json();
  const { name, green_bean_id, current_stock_kg, low_stock_threshold_kg, batch_size_kg, notes } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createServerClient();
  const initialStock = current_stock_kg ? parseFloat(current_stock_kg) : 0;

  const { data, error } = await supabase
    .from("roasted_stock")
    .insert({
      roaster_id: roaster.id,
      name,
      green_bean_id: green_bean_id || null,
      current_stock_kg: initialStock,
      low_stock_threshold_kg: low_stock_threshold_kg ? parseFloat(low_stock_threshold_kg) : null,
      batch_size_kg: batch_size_kg ? parseFloat(batch_size_kg) : null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create roasted stock" }, { status: 500 });

  // If initial stock was set, create an adjustment movement
  if (initialStock > 0) {
    await supabase.from("roasted_stock_movements").insert({
      roaster_id: roaster.id,
      roasted_stock_id: data.id,
      movement_type: "roast_addition",
      quantity_kg: initialStock,
      balance_after_kg: initialStock,
      notes: "Initial stock on creation",
    });
  }

  return NextResponse.json({ roastedStock: data }, { status: 201 });
}
