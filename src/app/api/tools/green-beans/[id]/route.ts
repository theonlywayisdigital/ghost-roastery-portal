import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: bean }, { data: movements }] = await Promise.all([
    supabase
      .from("green_beans")
      .select("*, suppliers(id, name)")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single(),
    supabase
      .from("green_bean_movements")
      .select("*")
      .eq("green_bean_id", id)
      .eq("roaster_id", roaster.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!bean) return NextResponse.json({ error: "Green bean not found" }, { status: 404 });
  return NextResponse.json({ greenBean: bean, movements: movements || [] });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const {
    name, origin_country, origin_region, variety, process, lot_number,
    supplier_id, arrival_date, cost_per_kg, cupping_score, tasting_notes,
    altitude_masl, harvest_year, low_stock_threshold_kg, notes, is_active,
  } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("green_beans")
    .update({
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
      low_stock_threshold_kg: low_stock_threshold_kg ? parseFloat(low_stock_threshold_kg) : null,
      notes: notes || null,
      is_active: is_active ?? true,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update green bean" }, { status: 500 });
  return NextResponse.json({ greenBean: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("green_beans")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete green bean" }, { status: 500 });
  return NextResponse.json({ success: true });
}
