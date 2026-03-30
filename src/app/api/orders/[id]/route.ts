import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const roasterId = user.roaster.id;
  const supabase = createServerClient();
  const orderType = req.nextUrl.searchParams.get("type") || "wholesale";

  if (orderType === "ghost") {
    // Fetch from ghost_orders table
    const { data: order, error } = await supabase
      .from("ghost_orders")
      .select("*")
      .eq("id", id)
      .eq("partner_roaster_id", roasterId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch roaster_order
    const { data: roasterOrder } = await supabase
      .from("roaster_orders")
      .select("*")
      .eq("order_id", id)
      .eq("roaster_id", roasterId)
      .single();

    // Fetch activity log
    const { data: activities } = await supabase
      .from("order_activity_log")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      orderType: "ghost",
      order,
      roasterOrder: roasterOrder || null,
      activities: activities || [],
    });
  }

  // Wholesale/storefront order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roasterId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Fetch invoice, activity log, and contact in parallel
  const [invoiceRes, activitiesRes, contactRes] = await Promise.all([
    order.invoice_id
      ? supabase
          .from("invoices")
          .select("id, invoice_number, status, total, amount_paid, amount_due, payment_due_date")
          .eq("id", order.invoice_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("order_activity_log")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    order.customer_email
      ? supabase
          .from("contacts")
          .select("id")
          .eq("roaster_id", roasterId)
          .eq("email", order.customer_email.toLowerCase())
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Check if roaster has invoice feature access
  const invoiceGate = await checkFeature(roasterId, "invoices");

  return NextResponse.json({
    orderType: order.order_channel === "wholesale" ? "wholesale" : "storefront",
    order,
    invoice: invoiceRes.data,
    activities: activitiesRes.data || [],
    contactId: contactRes.data?.id || null,
    invoicesAllowed: invoiceGate.allowed,
  });
}
