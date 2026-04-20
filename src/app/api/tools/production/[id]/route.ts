import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const { data: plan } = await supabase
    .from("production_plans")
    .select("*, green_beans(id, name), roasted_stock(name)")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!plan) return NextResponse.json({ error: "Production plan not found" }, { status: 404 });
  return NextResponse.json({ productionPlan: plan });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Build partial update payload — only include fields that were sent
  const updatePayload: Record<string, unknown> = {};

  if (body.planned_date !== undefined) updatePayload.planned_date = body.planned_date;
  if (body.green_bean_id !== undefined) updatePayload.green_bean_id = body.green_bean_id || null;
  if (body.green_bean_name !== undefined) updatePayload.green_bean_name = body.green_bean_name || null;
  if (body.roasted_stock_id !== undefined) updatePayload.roasted_stock_id = body.roasted_stock_id || null;
  if (body.product_id !== undefined) updatePayload.product_id = body.product_id || null;
  if (body.priority !== undefined) updatePayload.priority = body.priority ? parseInt(body.priority) : 0;
  if (body.status !== undefined) updatePayload.status = body.status || "planned";
  if (body.notes !== undefined) updatePayload.notes = body.notes || null;

  if (body.planned_weight_kg !== undefined) {
    const plannedKg = body.planned_weight_kg ? parseFloat(body.planned_weight_kg) : null;
    updatePayload.planned_weight_kg = plannedKg;

    // Auto-compute expected roasted kg when weight changes
    const lossPercent = body.expected_loss_percent !== undefined
      ? parseFloat(body.expected_loss_percent) || 15
      : 15;
    if (body.expected_loss_percent !== undefined) updatePayload.expected_loss_percent = lossPercent;
    if (plannedKg && plannedKg > 0) {
      updatePayload.expected_roasted_kg = Math.round(plannedKg * (1 - lossPercent / 100) * 1000) / 1000;
    }
  } else if (body.expected_loss_percent !== undefined) {
    updatePayload.expected_loss_percent = parseFloat(body.expected_loss_percent) || 15;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("production_plans")
    .update(updatePayload)
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update production plan" }, { status: 500 });
  return NextResponse.json({ productionPlan: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("production_plans")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete production plan" }, { status: 500 });
  return NextResponse.json({ success: true });
}
