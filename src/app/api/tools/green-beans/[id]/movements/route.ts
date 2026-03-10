import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { movement_type, quantity_kg, unit_cost, notes } = body;

  if (!movement_type || !quantity_kg) {
    return NextResponse.json({ error: "Movement type and quantity are required" }, { status: 400 });
  }

  const qty = parseFloat(quantity_kg);
  if (isNaN(qty) || qty === 0) {
    return NextResponse.json({ error: "Quantity must be a non-zero number" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current stock
  const { data: bean } = await supabase
    .from("green_beans")
    .select("id, current_stock_kg")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!bean) return NextResponse.json({ error: "Green bean not found" }, { status: 404 });

  const currentStock = parseFloat(bean.current_stock_kg) || 0;
  // For purchases and returns, qty should be positive (adds stock)
  // For deductions, waste, adjustment can be negative (removes stock)
  const effectiveQty = ["purchase", "return"].includes(movement_type) ? Math.abs(qty) : -Math.abs(qty);
  const newBalance = Math.max(0, currentStock + effectiveQty);

  // Create movement + update stock in a transaction-like fashion
  const { error: moveError } = await supabase.from("green_bean_movements").insert({
    roaster_id: roaster.id,
    green_bean_id: id,
    movement_type,
    quantity_kg: effectiveQty,
    balance_after_kg: newBalance,
    unit_cost: unit_cost ? parseFloat(unit_cost) : null,
    notes: notes || null,
  });

  if (moveError) return NextResponse.json({ error: "Failed to record movement" }, { status: 500 });

  // Update running balance
  const { error: updateError } = await supabase
    .from("green_beans")
    .update({ current_stock_kg: newBalance })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: "Failed to update stock balance" }, { status: 500 });

  return NextResponse.json({ balance: newBalance }, { status: 201 });
}
