import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

function computePrices(input: {
  green_cost_per_kg: number;
  roast_loss_percent: number;
  labour_cost_per_hour: number;
  roast_time_minutes: number;
  packaging_cost_per_unit: number;
  label_cost_per_unit: number;
  overhead_per_unit: number;
  bag_weight_grams: number;
  target_retail_margin_percent: number;
  target_wholesale_margin_percent: number;
}) {
  const {
    green_cost_per_kg,
    roast_loss_percent,
    labour_cost_per_hour,
    roast_time_minutes,
    packaging_cost_per_unit,
    label_cost_per_unit,
    overhead_per_unit,
    bag_weight_grams,
    target_retail_margin_percent,
    target_wholesale_margin_percent,
  } = input;

  const roasted_cost_per_kg = green_cost_per_kg / (1 - roast_loss_percent / 100);
  const green_cost_per_bag = roasted_cost_per_kg * (bag_weight_grams / 1000);
  const bags_per_batch = 1000 / bag_weight_grams;
  const labour_per_bag = (labour_cost_per_hour * roast_time_minutes / 60) / bags_per_batch;
  const total_cost = green_cost_per_bag + labour_per_bag + packaging_cost_per_unit + label_cost_per_unit + overhead_per_unit;
  const retail_price = total_cost / (1 - target_retail_margin_percent / 100);
  const wholesale_price = total_cost / (1 - target_wholesale_margin_percent / 100);

  return {
    calculated_cost_per_unit: Math.round(total_cost * 100) / 100,
    calculated_retail_price: Math.round(retail_price * 100) / 100,
    calculated_wholesale_price: Math.round(wholesale_price * 100) / 100,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cost_calculations")
    .select("*, green_beans(name)")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Calculation not found" }, { status: 404 });
  return NextResponse.json({ calculation: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const {
    name,
    green_bean_id,
    green_cost_per_kg,
    roast_loss_percent = 15,
    labour_cost_per_hour,
    roast_time_minutes,
    packaging_cost_per_unit,
    label_cost_per_unit,
    overhead_per_unit,
    bag_weight_grams = 250,
    target_retail_margin_percent = 50,
    target_wholesale_margin_percent = 30,
    product_id,
    notes,
    is_template,
  } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const computed = computePrices({
    green_cost_per_kg: parseFloat(green_cost_per_kg) || 0,
    roast_loss_percent: parseFloat(roast_loss_percent) || 15,
    labour_cost_per_hour: parseFloat(labour_cost_per_hour) || 0,
    roast_time_minutes: parseFloat(roast_time_minutes) || 0,
    packaging_cost_per_unit: parseFloat(packaging_cost_per_unit) || 0,
    label_cost_per_unit: parseFloat(label_cost_per_unit) || 0,
    overhead_per_unit: parseFloat(overhead_per_unit) || 0,
    bag_weight_grams: parseFloat(bag_weight_grams) || 250,
    target_retail_margin_percent: parseFloat(target_retail_margin_percent) || 50,
    target_wholesale_margin_percent: parseFloat(target_wholesale_margin_percent) || 30,
  });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cost_calculations")
    .update({
      name,
      green_bean_id: green_bean_id || null,
      green_cost_per_kg: parseFloat(green_cost_per_kg) || 0,
      roast_loss_percent: parseFloat(roast_loss_percent) || 15,
      labour_cost_per_hour: parseFloat(labour_cost_per_hour) || 0,
      roast_time_minutes: parseFloat(roast_time_minutes) || 0,
      packaging_cost_per_unit: parseFloat(packaging_cost_per_unit) || 0,
      label_cost_per_unit: parseFloat(label_cost_per_unit) || 0,
      overhead_per_unit: parseFloat(overhead_per_unit) || 0,
      bag_weight_grams: parseFloat(bag_weight_grams) || 250,
      target_retail_margin_percent: parseFloat(target_retail_margin_percent) || 50,
      target_wholesale_margin_percent: parseFloat(target_wholesale_margin_percent) || 30,
      product_id: product_id || null,
      notes: notes || null,
      is_template: is_template ?? false,
      ...computed,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update calculation" }, { status: 500 });
  return NextResponse.json({ calculation: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("cost_calculations")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete calculation" }, { status: 500 });
  return NextResponse.json({ success: true });
}
