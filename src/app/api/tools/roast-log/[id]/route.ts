import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";
import { updateWeightLossAverage } from "@/lib/roast-weight-loss";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: roastLog } = await supabase
    .from("roast_logs")
    .select("*, green_beans(id, name)")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!roastLog) return NextResponse.json({ error: "Roast log not found" }, { status: 404 });
  return NextResponse.json({ roastLog });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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

  const supabase = createServerClient();

  // Fetch current record to detect status change
  const { data: existing } = await supabase
    .from("roast_logs")
    .select("status, green_bean_id, green_weight_kg")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Roast log not found" }, { status: 404 });

  // Auto-compute weight loss percent
  const greenKg = green_weight_kg ? parseFloat(green_weight_kg) : null;
  const roastedKg = roasted_weight_kg ? parseFloat(roasted_weight_kg) : null;
  let weight_loss_percent: number | null = null;
  if (greenKg && roastedKg && greenKg > 0) {
    weight_loss_percent = Math.round(((greenKg - roastedKg) / greenKg) * 10000) / 100;
  }

  const { data, error } = await supabase
    .from("roast_logs")
    .update({
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
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update roast log" }, { status: 500 });

  // Auto-deduct green bean stock when status changes from draft to completed
  const statusChanged = existing.status === "draft" && status === "completed";
  const beanId = green_bean_id || null;
  if (statusChanged && beanId && greenKg && greenKg > 0) {
    const { data: bean } = await supabase
      .from("green_beans")
      .select("current_stock_kg")
      .eq("id", beanId)
      .eq("roaster_id", roaster.id)
      .single();

    if (bean) {
      const newStock = Math.max(0, (bean.current_stock_kg || 0) - greenKg);
      await supabase
        .from("green_beans")
        .update({ current_stock_kg: newStock })
        .eq("id", beanId)
        .eq("roaster_id", roaster.id);

      await supabase.from("green_bean_movements").insert({
        roaster_id: roaster.id,
        green_bean_id: beanId,
        movement_type: "roast_deduction",
        quantity_kg: -greenKg,
        balance_after_kg: newStock,
        reference_id: id,
        reference_type: "roast_log",
        notes: `Roast deduction for batch ${roast_number || id}`,
      });
    }
  }

  // Auto-add to roasted stock when status changes to completed and roasted_stock_id is provided
  if (statusChanged && roasted_stock_id && roasted_stock_qty_kg) {
    const stockQty = parseFloat(roasted_stock_qty_kg);
    if (stockQty > 0) {
      await supabase.rpc("replenish_roasted_stock", { stock_id: roasted_stock_id, qty_kg: stockQty });

      const { data: updatedStock } = await supabase
        .from("roasted_stock")
        .select("current_stock_kg")
        .eq("id", roasted_stock_id)
        .single();

      await supabase.from("roasted_stock_movements").insert({
        roaster_id: roaster.id,
        roasted_stock_id: roasted_stock_id,
        movement_type: "roast_addition",
        quantity_kg: stockQty,
        balance_after_kg: updatedStock?.current_stock_kg || stockQty,
        reference_id: id,
        reference_type: "roast_log",
        notes: `Roast output from batch ${roast_number || id}`,
      });
    }
  }

  // Push stock to ecommerce channels after roast completion (fire-and-forget)
  if (statusChanged && roasted_stock_id) {
    pushStockToChannels(roaster.id as string, roasted_stock_id).catch((err) =>
      console.error("[roast-log] Stock push error:", err)
    );
  }

  // Update average weight loss % on linked roasted stock profiles
  // Update for both old and new green bean (in case it changed)
  const beanIdsToUpdate = new Set<string>();
  if (green_bean_id) beanIdsToUpdate.add(green_bean_id);
  if (existing.green_bean_id && existing.green_bean_id !== green_bean_id) {
    beanIdsToUpdate.add(existing.green_bean_id);
  }
  for (const bId of Array.from(beanIdsToUpdate)) {
    updateWeightLossAverage(roaster.id as string, bId).catch((err) =>
      console.error("[roast-log] Weight loss avg update error:", err)
    );
  }

  return NextResponse.json({ roastLog: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("roast_logs")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete roast log" }, { status: 500 });
  return NextResponse.json({ success: true });
}
