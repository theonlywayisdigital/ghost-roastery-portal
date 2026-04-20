import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";
import { updateWeightLossAverage } from "@/lib/roast-weight-loss";
import type { NormalisedRoastLog, RoastLogImportResult } from "@/lib/roast-log-import";

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { logs, profileMapping, newGreenBeanIds: newGreenBeanIdsArr } = body as {
    logs: NormalisedRoastLog[];
    profileMapping: Record<string, { roasted_stock_id: string; green_bean_id: string | null } | null>;
    newGreenBeanIds?: string[];
  };
  // Green beans created during this import session — skip stock deduction for these
  const newGreenBeanIds = new Set(newGreenBeanIdsArr || []);

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
  // Track green bean IDs for weight loss average update
  const updatedGreenBeanIds = new Set<string>();

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

      // Atomic stock update: only when BOTH green bean AND roasted stock exist
      // Skip deduction for newly created green beans — roaster entered current real-world stock,
      // historical logs should not deduct from it
      const isNewGreenBean = profile.green_bean_id && newGreenBeanIds.has(profile.green_bean_id);
      if (profile.green_bean_id && profile.roasted_stock_id && greenKg > 0 && roastedKg > 0 && !isNewGreenBean) {
        const { error: rpcError } = await supabase.rpc("import_roast_stock_transfer", {
          p_roaster_id: roasterId,
          p_green_bean_id: profile.green_bean_id,
          p_roasted_stock_id: profile.roasted_stock_id,
          p_green_qty_kg: greenKg,
          p_roasted_qty_kg: roastedKg,
          p_reference_id: roastLog.id,
          p_batch_label: log.batch_number || null,
        });

        if (rpcError) {
          result.errors.push(`${rowLabel}: Stock update failed — ${rpcError.message}`);
        } else {
          updatedStockIds.add(profile.roasted_stock_id);
        }
      }

      if (profile.green_bean_id) {
        updatedGreenBeanIds.add(profile.green_bean_id);
      }

      result.imported++;
    } catch (err) {
      result.skipped++;
      result.errors.push(`${rowLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Push stock updates to ecommerce channels (fire-and-forget)
  for (const stockId of Array.from(updatedStockIds)) {
    pushStockToChannels(roasterId, stockId).catch((err) =>
      console.error("[roast-log-import] Stock push error:", err)
    );
  }

  // Update average weight loss % on linked roasted stock profiles (fire-and-forget)
  for (const greenBeanId of Array.from(updatedGreenBeanIds)) {
    updateWeightLossAverage(roasterId, greenBeanId).catch((err) =>
      console.error("[roast-log-import] Weight loss avg update error:", err)
    );
  }

  return NextResponse.json(result);
}
