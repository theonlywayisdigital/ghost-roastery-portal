import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();

  const [{ data: stock }, { data: movements }] = await Promise.all([
    supabase
      .from("roasted_stock")
      .select("*, green_beans(id, name)")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single(),
    supabase
      .from("roasted_stock_movements")
      .select("*")
      .eq("roasted_stock_id", id)
      .eq("roaster_id", roaster.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!stock) return NextResponse.json({ error: "Roasted stock not found" }, { status: 404 });
  return NextResponse.json({ roastedStock: stock, movements: movements || [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, green_bean_id, low_stock_threshold_kg, batch_size_kg, notes, is_active } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roasted_stock")
    .update({
      name,
      green_bean_id: green_bean_id || null,
      low_stock_threshold_kg: low_stock_threshold_kg ? parseFloat(low_stock_threshold_kg) : null,
      batch_size_kg: batch_size_kg ? parseFloat(batch_size_kg) : null,
      notes: notes || null,
      is_active: is_active ?? true,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update roasted stock" }, { status: 500 });
  return NextResponse.json({ roastedStock: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("roasted_stock")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete roasted stock" }, { status: 500 });
  return NextResponse.json({ success: true });
}
