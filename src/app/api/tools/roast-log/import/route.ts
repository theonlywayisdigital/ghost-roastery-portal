import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";
import type { NormalisedRoastLog, RoastLogImportResult } from "@/lib/roast-log-import";

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { logs, profileMapping } = body as {
    logs: NormalisedRoastLog[];
    profileMapping: Record<string, { roasted_stock_id: string; green_bean_id: string | null } | null>;
  };

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return NextResponse.json({ error: "No roast log rows provided" }, { status: 400 });
  }

  // Feature gate check
  const limitCheck = await checkLimit(roaster.id as string, "roastLogsPerMonth", logs.length);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message, upgrade_required: true }, { status: 403 });
  }

  const supabase = createServerClient();
  const roasterId = roaster.id as string;

  const result: RoastLogImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    total: logs.length,
  };

  // Track roasted stocks that were updated for ecommerce sync
  const updatedStockIds = new Set<string>();

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const rowLabel = `Row ${i + 1}`;

    // Get profile mapping (roasted_stock match)
    const profile = profileMapping[log.roast_profile];
    if (!profile) {
      result.skipped++;
      result.errors.push(`${rowLabel}: Roast profile "${log.roast_profile}" skipped (no match)`);
      continue;
    }

    const greenKg = log.green_weight_kg;
    const roastedKg = log.roasted_weight_kg;

    // Compute weight loss
    let weightLossPercent: number | null = null;
    if (greenKg > 0 && roastedKg > 0) {
      weightLossPercent = Math.round(((greenKg - roastedKg) / greenKg) * 10000) / 100;
    }

    try {
      // Insert roast_log record
      const { data: roastLog, error: insertError } = await supabase
        .from("roast_logs")
        .insert({
          roaster_id: roasterId,
          roast_date: log.roast_date,
          roast_number: log.batch_number,
          green_bean_id: profile.green_bean_id,
          green_bean_name: log.roast_profile,
          green_weight_kg: greenKg,
          roasted_weight_kg: roastedKg,
          weight_loss_percent: weightLossPercent,
          roast_time_seconds: log.duration_seconds,
          charge_temp_c: log.charge_temp_c,
          drop_temp_c: log.drop_temp_c,
          first_crack_time_seconds: log.first_crack_seconds,
          roaster_machine: log.machine,
          operator: log.operator,
          notes: log.notes,
          status: "completed",
        })
        .select("id")
        .single();

      if (insertError || !roastLog) {
        result.skipped++;
        result.errors.push(`${rowLabel}: Failed to create roast log — ${insertError?.message || "unknown error"}`);
        continue;
      }

      // Deduct green bean stock (same logic as single roast log POST)
      if (profile.green_bean_id && greenKg > 0) {
        const { data: bean } = await supabase
          .from("green_beans")
          .select("current_stock_kg")
          .eq("id", profile.green_bean_id)
          .eq("roaster_id", roasterId)
          .single();

        if (bean) {
          const newStock = Math.max(0, (bean.current_stock_kg || 0) - greenKg);
          await supabase
            .from("green_beans")
            .update({ current_stock_kg: newStock })
            .eq("id", profile.green_bean_id)
            .eq("roaster_id", roasterId);

          await supabase.from("green_bean_movements").insert({
            roaster_id: roasterId,
            green_bean_id: profile.green_bean_id,
            movement_type: "roast_deduction",
            quantity_kg: -greenKg,
            balance_after_kg: newStock,
            reference_id: roastLog.id,
            reference_type: "roast_log",
            notes: `Import: Roast deduction for batch ${log.batch_number || roastLog.id}`,
          });
        }
      }

      // Add to roasted stock (same logic as single roast log POST)
      if (profile.roasted_stock_id && roastedKg > 0) {
        await supabase.rpc("replenish_roasted_stock", {
          stock_id: profile.roasted_stock_id,
          qty_kg: roastedKg,
        });

        const { data: updatedStock } = await supabase
          .from("roasted_stock")
          .select("current_stock_kg")
          .eq("id", profile.roasted_stock_id)
          .single();

        await supabase.from("roasted_stock_movements").insert({
          roaster_id: roasterId,
          roasted_stock_id: profile.roasted_stock_id,
          movement_type: "roast_addition",
          quantity_kg: roastedKg,
          balance_after_kg: updatedStock?.current_stock_kg || roastedKg,
          reference_id: roastLog.id,
          reference_type: "roast_log",
          notes: `Import: Roast output from batch ${log.batch_number || roastLog.id}`,
        });

        updatedStockIds.add(profile.roasted_stock_id);
      }

      result.imported++;
    } catch (err) {
      result.skipped++;
      result.errors.push(`${rowLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Push stock updates to ecommerce channels (fire-and-forget)
  for (const stockId of updatedStockIds) {
    pushStockToChannels(roasterId, stockId).catch((err) =>
      console.error("[roast-log-import] Stock push error:", err)
    );
  }

  return NextResponse.json(result);
}
