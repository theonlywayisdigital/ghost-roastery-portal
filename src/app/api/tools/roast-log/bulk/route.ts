import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

const VALID_ACTIONS = ["delete", "undo"] as const;
type BulkAction = (typeof VALID_ACTIONS)[number];

export async function POST(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: BulkAction };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` }, { status: 400 });
  }

  const supabase = createServerClient();
  const roasterId = roaster.id as string;

  if (action === "delete") {
    const { count, error } = await supabase
      .from("roast_logs")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("roaster_id", roasterId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete roast logs" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, affected: count ?? 0 });
  }

  // action === "undo"
  // Fetch the roast logs to get their stock linkage data
  const { data: logs, error: fetchError } = await supabase
    .from("roast_logs")
    .select("id, roast_number, green_bean_id, green_weight_kg, roasted_weight_kg, status")
    .in("id", ids)
    .eq("roaster_id", roasterId);

  if (fetchError || !logs) {
    return NextResponse.json({ error: "Failed to fetch roast logs" }, { status: 500 });
  }

  let affected = 0;
  const errors: string[] = [];
  const updatedRoastedStockIds = new Set<string>();

  for (const log of logs) {
    const label = log.roast_number || log.id;

    try {
      // Only reverse stock for completed logs (draft/void logs shouldn't have stock movements)
      if (log.status === "completed") {
        const greenKg = log.green_weight_kg ? Number(log.green_weight_kg) : 0;
        const roastedKg = log.roasted_weight_kg ? Number(log.roasted_weight_kg) : 0;

        // 1. Reverse green bean deduction: add back green weight
        if (log.green_bean_id && greenKg > 0) {
          const { data: bean } = await supabase
            .from("green_beans")
            .select("current_stock_kg")
            .eq("id", log.green_bean_id)
            .eq("roaster_id", roasterId)
            .single();

          if (bean) {
            const newBalance = Number(bean.current_stock_kg) + greenKg;

            await supabase
              .from("green_beans")
              .update({ current_stock_kg: newBalance })
              .eq("id", log.green_bean_id)
              .eq("roaster_id", roasterId);

            await supabase.from("green_bean_movements").insert({
              roaster_id: roasterId,
              green_bean_id: log.green_bean_id,
              movement_type: "roast_undo",
              quantity_kg: greenKg,
              balance_after_kg: newBalance,
              reference_id: log.id,
              reference_type: "roast_log",
              notes: `Undo: Reversed roast deduction for batch ${label}`,
            });
          }
        }

        // 2. Reverse roasted stock addition: deduct roasted weight
        // Find roasted_stock_movements for this log to identify which roasted stock was credited
        if (roastedKg > 0) {
          const { data: movements } = await supabase
            .from("roasted_stock_movements")
            .select("roasted_stock_id, quantity_kg")
            .eq("reference_id", log.id)
            .eq("reference_type", "roast_log")
            .eq("roaster_id", roasterId)
            .eq("movement_type", "roast_addition");

          if (movements && movements.length > 0) {
            for (const mov of movements) {
              const qty = Number(mov.quantity_kg);
              const { data: stock } = await supabase
                .from("roasted_stock")
                .select("current_stock_kg")
                .eq("id", mov.roasted_stock_id)
                .eq("roaster_id", roasterId)
                .single();

              if (stock) {
                const newBalance = Math.max(0, Number(stock.current_stock_kg) - qty);

                await supabase
                  .from("roasted_stock")
                  .update({ current_stock_kg: newBalance })
                  .eq("id", mov.roasted_stock_id)
                  .eq("roaster_id", roasterId);

                await supabase.from("roasted_stock_movements").insert({
                  roaster_id: roasterId,
                  roasted_stock_id: mov.roasted_stock_id,
                  movement_type: "roast_undo",
                  quantity_kg: -qty,
                  balance_after_kg: newBalance,
                  reference_id: log.id,
                  reference_type: "roast_log",
                  notes: `Undo: Reversed roast output for batch ${label}`,
                });

                updatedRoastedStockIds.add(mov.roasted_stock_id);
              }
            }
          }
        }
      }

      // 3. Delete the roast log
      const { error: deleteError } = await supabase
        .from("roast_logs")
        .delete()
        .eq("id", log.id)
        .eq("roaster_id", roasterId);

      if (deleteError) {
        errors.push(`Batch ${label}: Failed to delete — ${deleteError.message}`);
        continue;
      }

      affected++;
    } catch (err) {
      errors.push(`Batch ${label}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Push stock updates to ecommerce channels (fire-and-forget)
  for (const stockId of Array.from(updatedRoastedStockIds)) {
    pushStockToChannels(roasterId, stockId).catch((err) =>
      console.error("[roast-log-undo] Stock push error:", err)
    );
  }

  return NextResponse.json({ ok: true, affected, errors: errors.length > 0 ? errors : undefined });
}
