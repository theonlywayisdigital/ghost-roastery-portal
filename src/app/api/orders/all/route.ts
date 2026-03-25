import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface UnifiedRoasterOrder {
  id: string;
  orderNumber: string;
  orderType: "ghost" | "storefront" | "wholesale";
  customerName: string | null;
  customerEmail: string;
  customerBusiness: string | null;
  itemSummary: string;
  total: number;
  status: string;
  paymentStatus: string;
  date: string;
  externalSource: string | null;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();
  const params = req.nextUrl.searchParams;
  const tab = params.get("tab") || "all";
  const search = params.get("search") || "";
  const status = params.get("status") || "";

  const unified: UnifiedRoasterOrder[] = [];

  // Fetch Roastery Platform orders (if roaster is a partner)
  if (tab === "all" || tab === "ghost") {
    const { data: ghostOrders } = await supabase
      .from("ghost_orders")
      .select("id, order_number, customer_name, customer_email, brand_name, bag_size, bag_colour, roast_profile, grind, quantity, partner_payout_total, order_status, payment_status, created_at")
      .eq("partner_roaster_id", roasterId)
      .order("created_at", { ascending: false });

    for (const o of ghostOrders || []) {
      if (search && !o.customer_name?.toLowerCase().includes(search.toLowerCase()) && !o.customer_email?.toLowerCase().includes(search.toLowerCase()) && !o.order_number?.toLowerCase().includes(search.toLowerCase())) continue;
      if (status && o.order_status !== status) continue;

      unified.push({
        id: o.id,
        orderNumber: o.order_number,
        orderType: "ghost",
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerBusiness: o.brand_name,
        itemSummary: `${o.quantity}× ${o.bag_size} ${o.roast_profile}`,
        total: o.partner_payout_total || 0,
        status: o.order_status || "Pending",
        paymentStatus: o.payment_status || "pending",
        date: o.created_at,
        externalSource: null,
      });
    }
  }

  // Fetch wholesale/storefront orders
  if (tab === "all" || tab === "storefront" || tab === "wholesale") {
    let query = supabase
      .from("orders")
      .select("*")
      .eq("roaster_id", roasterId)
      .order("created_at", { ascending: false });

    if (tab === "storefront") query = query.eq("order_channel", "storefront");
    if (tab === "wholesale") query = query.eq("order_channel", "wholesale");

    const { data: wsOrders } = await query;

    // Fetch invoice statuses
    const invoiceIds = (wsOrders || []).map((wo) => wo.invoice_id).filter(Boolean) as string[];
    let invoiceMap = new Map<string, string>();
    if (invoiceIds.length > 0) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, status")
        .in("id", Array.from(new Set(invoiceIds)));
      invoiceMap = new Map((invoices || []).map((inv) => [inv.id, inv.status]));
    }

    for (const wo of wsOrders || []) {
      if (search && !wo.customer_name?.toLowerCase().includes(search.toLowerCase()) && !wo.customer_email?.toLowerCase().includes(search.toLowerCase()) && !wo.customer_business?.toLowerCase().includes(search.toLowerCase())) continue;
      if (status && wo.status !== status) continue;

      const items = wo.items as Array<{ name?: string; quantity?: number }>;
      const itemCount = Array.isArray(items) ? items.length : 0;
      const totalQty = Array.isArray(items) ? items.reduce((sum: number, it: { quantity?: number }) => sum + (it.quantity || 0), 0) : 0;

      const channel = wo.order_channel || "storefront";

      // Derive payment status
      let derivedPaymentStatus = "pending";
      if (wo.stripe_payment_id) {
        derivedPaymentStatus = "paid";
      } else if (wo.invoice_id) {
        const invStatus = invoiceMap.get(wo.invoice_id);
        if (invStatus === "paid") derivedPaymentStatus = "paid";
        else if (invStatus === "partially_paid") derivedPaymentStatus = "partial";
        else if (invStatus === "overdue") derivedPaymentStatus = "overdue";
        else if (invStatus === "sent" || invStatus === "viewed") derivedPaymentStatus = "awaiting payment";
        else if (invStatus === "draft") derivedPaymentStatus = "invoice draft";
        else derivedPaymentStatus = "awaiting payment";
      } else if (wo.payment_method === "invoice_offline" || wo.payment_method === "invoice_online") {
        derivedPaymentStatus = "awaiting invoice";
      }

      unified.push({
        id: wo.id,
        orderNumber: wo.id.slice(0, 8).toUpperCase(),
        orderType: channel as "storefront" | "wholesale",
        customerName: wo.customer_name,
        customerEmail: wo.customer_email,
        customerBusiness: wo.customer_business,
        itemSummary: `${totalQty} items (${itemCount} products)`,
        total: wo.roaster_payout || wo.subtotal,
        status: wo.status || "pending",
        paymentStatus: derivedPaymentStatus,
        date: wo.created_at,
        externalSource: wo.external_source || null,
      });
    }
  }

  // Sort by date descending
  unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ data: unified });
}
