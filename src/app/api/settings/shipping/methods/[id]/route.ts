import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, free_threshold, estimated_days, is_active, max_weight_kg } = body;

    const supabase = createServerClient();
    const { error } = await supabase
      .from("shipping_methods")
      .update({
        name: name?.trim(),
        price: price ?? 0,
        free_threshold: free_threshold || null,
        estimated_days: estimated_days || null,
        is_active: is_active ?? true,
        max_weight_kg: max_weight_kg != null ? parseFloat(max_weight_kg) : null,
      })
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      console.error("Shipping method update error:", error);
      return NextResponse.json(
        { error: "Failed to update shipping method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shipping method update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { error } = await supabase
      .from("shipping_methods")
      .delete()
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      console.error("Shipping method delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete shipping method" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shipping method delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
