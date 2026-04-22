import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { updateCommittedStock } from "@/lib/standing-orders";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const buyerId = searchParams.get("buyerId");

  let query = supabase
    .from("standing_orders")
    .select(
      `*, wholesale_access!inner(id, business_name, user_id, payment_terms, users!wholesale_access_user_id_fkey(full_name, email))`
    )
    .eq("roaster_id", roasterId)
    .order("next_delivery_date", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }
  if (buyerId) {
    query = query.eq("wholesale_access_id", buyerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[standing-orders] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch standing orders" },
      { status: 500 }
    );
  }

  return NextResponse.json({ standingOrders: data || [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  const body = await request.json();
  const {
    wholesaleAccessId,
    items,
    frequency,
    nextDeliveryDate,
    deliveryAddress,
    paymentTerms,
    notes,
  } = body as {
    wholesaleAccessId: string;
    items: { productId: string; variantId?: string; quantity: number; unitPrice: number }[];
    frequency: "weekly" | "fortnightly" | "monthly";
    nextDeliveryDate: string;
    deliveryAddress?: Record<string, unknown>;
    paymentTerms?: string;
    notes?: string;
  };

  if (!wholesaleAccessId || !items?.length || !frequency || !nextDeliveryDate) {
    return NextResponse.json(
      { error: "Missing required fields: wholesaleAccessId, items, frequency, nextDeliveryDate" },
      { status: 400 }
    );
  }

  // Validate the buyer belongs to this roaster
  const { data: access } = await supabase
    .from("wholesale_access")
    .select("id, user_id, payment_terms")
    .eq("id", wholesaleAccessId)
    .eq("roaster_id", roasterId)
    .eq("status", "approved")
    .single();

  if (!access) {
    return NextResponse.json(
      { error: "Wholesale buyer not found or not approved" },
      { status: 400 }
    );
  }

  const { data: order, error } = await supabase
    .from("standing_orders")
    .insert({
      roaster_id: roasterId,
      wholesale_access_id: wholesaleAccessId,
      buyer_user_id: access.user_id,
      items,
      frequency,
      next_delivery_date: nextDeliveryDate,
      delivery_address: deliveryAddress || null,
      payment_terms: paymentTerms || access.payment_terms || "net30",
      notes: notes || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[standing-orders] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create standing order" },
      { status: 500 }
    );
  }

  // Update committed stock
  await updateCommittedStock(supabase, roasterId);

  return NextResponse.json({ id: order.id }, { status: 201 });
}
