import { createServerClient } from "@/lib/supabase";

/**
 * Recalculate the average weight loss % for all roasted stock profiles
 * linked to a given green bean, and update roasted_stock.weight_loss_percentage.
 *
 * Formula: AVG((green_weight_kg - roasted_weight_kg) / green_weight_kg * 100)
 * across all completed roast logs for that green bean.
 *
 * Call this after any roast log create, update, or import.
 */
export async function updateWeightLossAverage(
  roasterId: string,
  greenBeanId: string
): Promise<void> {
  const supabase = createServerClient();

  // Calculate average weight loss % from all completed logs for this green bean
  const { data: logs } = await supabase
    .from("roast_logs")
    .select("green_weight_kg, roasted_weight_kg")
    .eq("roaster_id", roasterId)
    .eq("green_bean_id", greenBeanId)
    .eq("status", "completed")
    .gt("green_weight_kg", 0)
    .gt("roasted_weight_kg", 0);

  if (!logs || logs.length === 0) return;

  // Compute average weight loss %
  let totalLossPct = 0;
  let validCount = 0;

  for (const log of logs) {
    const green = Number(log.green_weight_kg);
    const roasted = Number(log.roasted_weight_kg);
    if (green > 0 && roasted > 0) {
      totalLossPct += ((green - roasted) / green) * 100;
      validCount++;
    }
  }

  if (validCount === 0) return;

  const avgLossPct = Math.round((totalLossPct / validCount) * 100) / 100;

  // Update all roasted stock profiles linked to this green bean
  await supabase
    .from("roasted_stock")
    .update({ weight_loss_percentage: avgLossPct })
    .eq("roaster_id", roasterId)
    .eq("green_bean_id", greenBeanId);
}
