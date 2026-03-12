import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type") || "ghost";
  const supabase = createServerClient();

  if (type === "ghost") {
    const { data: order } = await supabase
      .from("ghost_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch roaster order for tracking info
    const { data: roasterOrder } = await supabase
      .from("roaster_orders")
      .select("tracking_number, tracking_carrier, dispatched_at, delivered_at, accepted_at")
      .eq("order_id", id)
      .single();

    return NextResponse.json({
      orderType: "ghost",
      order,
      roasterOrder: roasterOrder || null,
    });
  }

  // Wholesale / storefront
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("customer_email", user.email)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Fetch invoice if linked
  let invoice = null;
  if (order.invoice_id) {
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, amount_paid, amount_due, payment_due_date, invoice_access_token")
      .eq("id", order.invoice_id)
      .single();
    invoice = data;
  }

  return NextResponse.json({
    orderType: order.order_channel === "wholesale" ? "wholesale" : "storefront",
    order,
    invoice,
  });
}
