import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getNextDeliveryDate } from "@/lib/standing-orders";

interface StandingOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3001";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const cookieHeader = headersList.get("cookie") || "";

  const { id } = await params;
  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  // Fetch the standing order
  const { data: so } = await supabase
    .from("standing_orders")
    .select(
      `*, wholesale_access(id, business_name, user_id, payment_terms, users!wholesale_access_user_id_fkey(full_name, email))`
    )
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (!so) {
    return NextResponse.json(
      { error: "Standing order not found" },
      { status: 404 }
    );
  }

  if (so.status !== "active") {
    return NextResponse.json(
      { error: "Standing order is not active" },
      { status: 400 }
    );
  }

  const wa = so.wholesale_access as {
    id: string;
    business_name: string;
    user_id: string;
    payment_terms: string;
    users: { full_name: string | null; email: string } | { full_name: string | null; email: string }[];
  };
  const buyerUser = Array.isArray(wa.users) ? wa.users[0] : wa.users;
  const items = so.items as StandingOrderItem[];

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Standing order has no items" },
      { status: 400 }
    );
  }

  try {
    const orderPayload = {
      orderChannel: "wholesale",
      customerId: wa.user_id,
      customerName: buyerUser?.full_name || wa.business_name,
      customerEmail: buyerUser?.email || "",
      customerBusiness: wa.business_name,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId || undefined,
        unitPrice: item.unitPrice,
      })),
      deliveryAddress: so.delivery_address || undefined,
      paymentMethod: "invoice",
      paymentTerms: so.payment_terms || wa.payment_terms || "net30",
      notes: `Auto-generated from standing order`,
      status: "confirmed",
    };

    const res = await fetch(`${baseUrl}/api/orders/create-manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Link the created order back to this standing order
    if (result.orderId) {
      await supabase
        .from("orders")
        .update({ standing_order_id: so.id })
        .eq("id", result.orderId);
    }

    // Record success
    await supabase.from("standing_order_history").insert({
      standing_order_id: so.id,
      order_id: result.orderId,
      status: "success",
      summary: {
        buyer_name: wa.business_name,
        items_count: items.length,
        total,
      },
    });

    // Advance next_delivery_date
    const nextDate = getNextDeliveryDate(so.next_delivery_date, so.frequency);
    await supabase
      .from("standing_orders")
      .update({ next_delivery_date: nextDate })
      .eq("id", so.id);

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      nextDeliveryDate: nextDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[standing-orders/${id}/generate] Failed:`, message);

    await supabase.from("standing_order_history").insert({
      standing_order_id: so.id,
      status: "failed",
      error_message: message,
      summary: { buyer_name: wa.business_name },
    });

    return NextResponse.json(
      { error: `Failed to generate order: ${message}` },
      { status: 500 }
    );
  }
}
