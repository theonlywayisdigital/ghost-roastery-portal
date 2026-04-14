import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { movement_type, quantity_kg, unit_cost, notes, deduct_green_bean_kg } = body;

  if (!movement_type || !quantity_kg) {
    return NextResponse.json({ error: "Movement type and quantity are required" }, { status: 400 });
  }

  const qty = parseFloat(quantity_kg);
  if (isNaN(qty) || qty === 0) {
    return NextResponse.json({ error: "Quantity must be a non-zero number" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current stock (include green_bean_id for deduction)
  const { data: stock } = await supabase
    .from("roasted_stock")
    .select("id, current_stock_kg, green_bean_id")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!stock) return NextResponse.json({ error: "Roasted stock not found" }, { status: 404 });

  const currentStock = parseFloat(String(stock.current_stock_kg)) || 0;
  // roast_addition and cancellation_return add stock; order_deduction and waste remove stock
  // adjustments preserve sign as-is (can add or remove)
  const effectiveQty = ["roast_addition", "cancellation_return"].includes(movement_type)
    ? Math.abs(qty)
    : movement_type === "adjustment"
    ? qty
    : -Math.abs(qty);
  const newBalance = Math.max(0, currentStock + effectiveQty);

  // Create movement record
  const { error: moveError } = await supabase.from("roasted_stock_movements").insert({
    roaster_id: roaster.id,
    roasted_stock_id: id,
    movement_type,
    quantity_kg: effectiveQty,
    balance_after_kg: newBalance,
    unit_cost: unit_cost ? parseFloat(unit_cost) : null,
    notes: notes || null,
  });

  if (moveError) return NextResponse.json({ error: "Failed to record movement" }, { status: 500 });

  // Update running balance using RPC for additions, direct update for deductions
  if (effectiveQty > 0) {
    await supabase.rpc("replenish_roasted_stock", { stock_id: id, qty_kg: effectiveQty });
  } else {
    await supabase.rpc("deduct_roasted_stock", { stock_id: id, qty_kg: Math.abs(effectiveQty) });
  }

  // Deduct from linked green bean if requested
  let greenBeanBalance: number | null = null;
  if (deduct_green_bean_kg && stock.green_bean_id) {
    const deductKg = parseFloat(deduct_green_bean_kg);
    if (deductKg > 0) {
      const { data: bean } = await supabase
        .from("green_beans")
        .select("id, current_stock_kg")
        .eq("id", stock.green_bean_id)
        .eq("roaster_id", roaster.id)
        .single();

      if (bean) {
        const greenCurrent = parseFloat(String(bean.current_stock_kg)) || 0;
        greenBeanBalance = Math.max(0, greenCurrent - deductKg);

        await supabase.from("green_bean_movements").insert({
          roaster_id: roaster.id,
          green_bean_id: stock.green_bean_id,
          movement_type: "roast_deduction",
          quantity_kg: -deductKg,
          balance_after_kg: greenBeanBalance,
          notes: notes ? `Roast deduction: ${notes}` : "Roast deduction from roasted stock movement",
        });

        await supabase
          .from("green_beans")
          .update({ current_stock_kg: greenBeanBalance })
          .eq("id", stock.green_bean_id);
      }
    }
  }

  // Push stock to ecommerce channels (fire-and-forget)
  pushStockToChannels(roaster.id as string, id).catch((err) =>
    console.error("[roasted-stock-movement] Stock push error:", err)
  );

  return NextResponse.json({ balance: newBalance, green_bean_balance: greenBeanBalance }, { status: 201 });
}
