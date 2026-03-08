import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = await getGRRoasterId();
  const params = req.nextUrl.searchParams;
  const status = params.get("status") || "";
  const search = params.get("search") || "";

  const supabase = createServerClient();

  let query = supabase
    .from("wholesale_orders")
    .select("*")
    .eq("roaster_id", roasterId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_business.ilike.%${search}%`
    );
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error("Failed to fetch GR wholesale orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }

  // Derive payment status for each order
  const invoiceIds = (orders || [])
    .map((o) => o.invoice_id)
    .filter(Boolean) as string[];

  let invoiceMap = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, status")
      .in("id", Array.from(new Set(invoiceIds)));
    invoiceMap = new Map(
      (invoices || []).map((inv) => [inv.id, inv.status])
    );
  }

  const enriched = (orders || []).map((wo) => {
    const items = wo.items as Array<{ name?: string; quantity?: number }>;
    const totalQty = Array.isArray(items)
      ? items.reduce((sum: number, it: { quantity?: number }) => sum + (it.quantity || 0), 0)
      : 0;
    const itemCount = Array.isArray(items) ? items.length : 0;

    let paymentStatus = "pending";
    if (wo.stripe_payment_id) {
      paymentStatus = "paid";
    } else if (wo.invoice_id) {
      const invStatus = invoiceMap.get(wo.invoice_id);
      if (invStatus === "paid") paymentStatus = "paid";
      else if (invStatus === "partially_paid") paymentStatus = "partial";
      else if (invStatus === "overdue") paymentStatus = "overdue";
      else if (invStatus === "sent" || invStatus === "viewed") paymentStatus = "awaiting payment";
      else if (invStatus === "draft") paymentStatus = "invoice draft";
      else paymentStatus = "awaiting payment";
    } else if (wo.payment_method === "invoice_offline" || wo.payment_method === "invoice_online") {
      paymentStatus = "awaiting invoice";
    }

    return {
      id: wo.id,
      orderNumber: wo.id.slice(0, 8).toUpperCase(),
      date: wo.created_at,
      customerName: wo.customer_name,
      customerEmail: wo.customer_email,
      customerBusiness: wo.customer_business,
      status: wo.status,
      paymentStatus,
      total: wo.subtotal,
      itemSummary: `${totalQty} items (${itemCount} products)`,
    };
  });

  return NextResponse.json({ orders: enriched });
}
