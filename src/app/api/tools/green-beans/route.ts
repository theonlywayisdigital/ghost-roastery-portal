import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("green_beans")
    .select("*, suppliers(name)")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch green beans" }, { status: 500 });
  return NextResponse.json({ greenBeans: data });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(roaster.id as string, "greenBeans", 1);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message, upgrade_required: true }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, origin_country, origin_region, variety, process, lot_number,
    supplier_id, arrival_date, cost_per_kg, cupping_score, tasting_notes,
    altitude_masl, harvest_year, current_stock_kg, low_stock_threshold_kg, notes,
  } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("green_beans")
    .insert({
      roaster_id: roaster.id,
      name,
      origin_country: origin_country || null,
      origin_region: origin_region || null,
      variety: variety || null,
      process: process || null,
      lot_number: lot_number || null,
      supplier_id: supplier_id || null,
      arrival_date: arrival_date || null,
      cost_per_kg: cost_per_kg ? parseFloat(cost_per_kg) : null,
      cupping_score: cupping_score ? parseFloat(cupping_score) : null,
      tasting_notes: tasting_notes || null,
      altitude_masl: altitude_masl ? parseInt(altitude_masl) : null,
      harvest_year: harvest_year || null,
      current_stock_kg: current_stock_kg ? parseFloat(current_stock_kg) : 0,
      low_stock_threshold_kg: low_stock_threshold_kg ? parseFloat(low_stock_threshold_kg) : null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create green bean" }, { status: 500 });

  // If initial stock was set, create a purchase movement
  const initialStock = current_stock_kg ? parseFloat(current_stock_kg) : 0;
  if (initialStock > 0) {
    await supabase.from("green_bean_movements").insert({
      roaster_id: roaster.id,
      green_bean_id: data.id,
      movement_type: "purchase",
      quantity_kg: initialStock,
      balance_after_kg: initialStock,
      unit_cost: cost_per_kg ? parseFloat(cost_per_kg) : null,
      notes: "Initial stock on creation",
    });
  }

  return NextResponse.json({ greenBean: data }, { status: 201 });
}
