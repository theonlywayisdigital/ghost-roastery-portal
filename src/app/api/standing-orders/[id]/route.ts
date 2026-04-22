import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { updateCommittedStock } from "@/lib/standing-orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("standing_orders")
    .select(
      `*, wholesale_access(id, business_name, user_id, payment_terms, users!wholesale_access_user_id_fkey(full_name, email))`
    )
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  // Fetch history
  const { data: history } = await supabase
    .from("standing_order_history")
    .select("*")
    .eq("standing_order_id", id)
    .order("generated_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ standingOrder: data, history: history || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("standing_orders")
    .select("id, status")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const {
    items,
    frequency,
    nextDeliveryDate,
    deliveryAddress,
    paymentTerms,
    notes,
    status,
  } = body as {
    items?: { productId: string; variantId?: string; quantity: number; unitPrice: number }[];
    frequency?: string;
    nextDeliveryDate?: string;
    deliveryAddress?: Record<string, unknown>;
    paymentTerms?: string;
    notes?: string;
    status?: "active" | "paused" | "cancelled";
  };

  const update: Record<string, unknown> = {};
  if (items !== undefined) update.items = items;
  if (frequency !== undefined) update.frequency = frequency;
  if (nextDeliveryDate !== undefined) update.next_delivery_date = nextDeliveryDate;
  if (deliveryAddress !== undefined) update.delivery_address = deliveryAddress;
  if (paymentTerms !== undefined) update.payment_terms = paymentTerms;
  if (notes !== undefined) update.notes = notes;
  if (status !== undefined) update.status = status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("standing_orders")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[standing-orders] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update standing order" },
      { status: 500 }
    );
  }

  // Recalculate committed stock if items or status changed
  if (items !== undefined || status !== undefined) {
    await updateCommittedStock(supabase, roasterId);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from("standing_orders")
    .select("id")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  // Soft delete — set to cancelled
  const { error } = await supabase
    .from("standing_orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("[standing-orders] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to cancel standing order" },
      { status: 500 }
    );
  }

  await updateCommittedStock(supabase, roasterId);

  return NextResponse.json({ success: true });
}
