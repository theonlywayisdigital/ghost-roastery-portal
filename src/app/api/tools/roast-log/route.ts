import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roast_logs")
    .select("*, green_beans(name)")
    .eq("roaster_id", roaster.id)
    .order("roast_date", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch roast logs" }, { status: 500 });
  return NextResponse.json({ roastLogs: data });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitCheck = await checkLimit(roaster.id as string, "roastLogsPerMonth", 1);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message, upgrade_required: true }, { status: 403 });
  }

  const body = await request.json();
  const {
    roast_date, roast_number, green_bean_id, green_bean_name,
    green_weight_kg, roasted_weight_kg,
    roast_level, roast_time_seconds, charge_temp_c,
    first_crack_time_seconds, first_crack_temp_c,
    second_crack_time_seconds, second_crack_temp_c,
    drop_temp_c, roaster_machine, operator,
    ambient_temp_c, ambient_humidity_percent,
    quality_rating, notes, product_id, status,
    roasted_stock_id, roasted_stock_qty_kg,
  } = body;

  if (!roast_date) return NextResponse.json({ error: "Roast date is required" }, { status: 400 });

  // Auto-compute weight loss percent
  const greenKg = green_weight_kg ? parseFloat(green_weight_kg) : null;
  const roastedKg = roasted_weight_kg ? parseFloat(roasted_weight_kg) : null;
  let weight_loss_percent: number | null = null;
  if (greenKg && roastedKg && greenKg > 0) {
    weight_loss_percent = Math.round(((greenKg - roastedKg) / greenKg) * 10000) / 100;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roast_logs")
    .insert({
      roaster_id: roaster.id,
      roast_date,
      roast_number: roast_number || null,
      green_bean_id: green_bean_id || null,
      green_bean_name: green_bean_name || null,
      green_weight_kg: greenKg,
      roasted_weight_kg: roastedKg,
      weight_loss_percent,
      roast_level: roast_level || null,
      roast_time_seconds: roast_time_seconds ? parseInt(roast_time_seconds) : null,
      charge_temp_c: charge_temp_c ? parseFloat(charge_temp_c) : null,
      first_crack_time_seconds: first_crack_time_seconds ? parseInt(first_crack_time_seconds) : null,
      first_crack_temp_c: first_crack_temp_c ? parseFloat(first_crack_temp_c) : null,
      second_crack_time_seconds: second_crack_time_seconds ? parseInt(second_crack_time_seconds) : null,
      second_crack_temp_c: second_crack_temp_c ? parseFloat(second_crack_temp_c) : null,
      drop_temp_c: drop_temp_c ? parseFloat(drop_temp_c) : null,
      roaster_machine: roaster_machine || null,
      operator: operator || null,
      ambient_temp_c: ambient_temp_c ? parseFloat(ambient_temp_c) : null,
      ambient_humidity_percent: ambient_humidity_percent ? parseFloat(ambient_humidity_percent) : null,
      quality_rating: quality_rating ? parseInt(quality_rating) : null,
      notes: notes || null,
      product_id: product_id || null,
      status: status || "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create roast log" }, { status: 500 });

  // Auto-deduct green bean stock when status is completed and green_bean_id is present
  if (status === "completed" && green_bean_id && greenKg && greenKg > 0) {
    // Deduct from green_beans.current_stock_kg
    const { data: bean } = await supabase
      .from("green_beans")
      .select("current_stock_kg")
      .eq("id", green_bean_id)
      .eq("roaster_id", roaster.id)
      .single();

    if (bean) {
      const newStock = Math.max(0, (bean.current_stock_kg || 0) - greenKg);
      await supabase
        .from("green_beans")
        .update({ current_stock_kg: newStock })
        .eq("id", green_bean_id)
        .eq("roaster_id", roaster.id);

      // Create green_bean_movements record
      await supabase.from("green_bean_movements").insert({
        roaster_id: roaster.id,
        green_bean_id,
        movement_type: "roast_deduction",
        quantity_kg: -greenKg,
        balance_after_kg: newStock,
        reference_id: data.id,
        reference_type: "roast_log",
        notes: `Roast deduction for batch ${roast_number || data.id}`,
      });
    }
  }

  // Auto-add to roasted stock when status is completed and roasted_stock_id is provided
  if (status === "completed" && roasted_stock_id && roasted_stock_qty_kg) {
    const stockQty = parseFloat(roasted_stock_qty_kg);
    if (stockQty > 0) {
      // Replenish roasted stock via RPC
      await supabase.rpc("replenish_roasted_stock", { stock_id: roasted_stock_id, qty_kg: stockQty });

      // Get updated balance for movement record
      const { data: updatedStock } = await supabase
        .from("roasted_stock")
        .select("current_stock_kg")
        .eq("id", roasted_stock_id)
        .single();

      // Create roasted_stock_movements record
      await supabase.from("roasted_stock_movements").insert({
        roaster_id: roaster.id,
        roasted_stock_id: roasted_stock_id,
        movement_type: "roast_addition",
        quantity_kg: stockQty,
        balance_after_kg: updatedStock?.current_stock_kg || stockQty,
        reference_id: data.id,
        reference_type: "roast_log",
        notes: `Roast output from batch ${roast_number || data.id}`,
      });
    }
  }

  return NextResponse.json({ roastLog: data }, { status: 201 });
}
