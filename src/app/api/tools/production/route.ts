import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("production_plans")
    .select("*, green_beans(name)")
    .eq("roaster_id", roaster.id)
    .order("planned_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch production plans" }, { status: 500 });
  return NextResponse.json({ productionPlans: data });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    planned_date, green_bean_id, green_bean_name,
    planned_weight_kg, expected_loss_percent,
    product_id, priority, status, notes,
  } = body;

  if (!planned_date) return NextResponse.json({ error: "Planned date is required" }, { status: 400 });

  // Auto-compute expected roasted kg
  const plannedKg = planned_weight_kg ? parseFloat(planned_weight_kg) : null;
  const lossPercent = expected_loss_percent ? parseFloat(expected_loss_percent) : 15;
  let expected_roasted_kg: number | null = null;
  if (plannedKg && plannedKg > 0) {
    expected_roasted_kg = Math.round(plannedKg * (1 - lossPercent / 100) * 1000) / 1000;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("production_plans")
    .insert({
      roaster_id: roaster.id,
      planned_date,
      green_bean_id: green_bean_id || null,
      green_bean_name: green_bean_name || null,
      planned_weight_kg: plannedKg,
      expected_roasted_kg,
      expected_loss_percent: lossPercent,
      product_id: product_id || null,
      priority: priority ? parseInt(priority) : 0,
      status: status || "planned",
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create production plan" }, { status: 500 });
  return NextResponse.json({ productionPlan: data }, { status: 201 });
}
