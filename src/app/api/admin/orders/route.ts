import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import type { UnifiedOrder, OrderType } from "@/types/admin";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const paymentStatus = params.get("paymentStatus") || "";
  const orderType = (params.get("orderType") || "") as OrderType | "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const roasterId = params.get("roasterId") || "";
  const artworkStatus = params.get("artworkStatus") || "";
  const sortKey = params.get("sortKey") || "date";
  const sortDir = params.get("sortDir") || "desc";

  const supabase = createServerClient();
  const unified: UnifiedOrder[] = [];

  // Fetch roasters lookup for name resolution
  const { data: roastersList } = await supabase
    .from("partner_roasters")
    .select("id, business_name, storefront_type, is_ghost_roaster");
  const roasterMap = new Map(
    (roastersList || []).map((r) => [r.id, r])
  );

  // Fetch Ghost Roastery orders
  if (!orderType || orderType === "ghost") {
    let query = supabase.from("ghost_orders").select("*");

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,brand_name.ilike.%${search}%`
      );
    }
    if (status) query = query.eq("order_status", status);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (roasterId) query = query.eq("roaster_id", roasterId);
    if (artworkStatus) query = query.eq("artwork_status", artworkStatus);

    const { data: orders } = await query;

    if (orders) {
      for (const o of orders) {
        const roaster = o.roaster_id ? roasterMap.get(o.roaster_id) : null;
        unified.push({
          id: o.id,
          orderNumber: o.order_number,
          orderType: "ghost",
          date: o.created_at,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          customerBusiness: o.brand_name,
          status: o.order_status,
          paymentStatus: o.payment_status,
          total: o.total_price,
          roasterName: roaster?.business_name || null,
          roasterId: o.roaster_id,
          artworkStatus: o.artwork_status ?? null,
          source: o.order_source ?? null,
          itemSummary: `${o.quantity}× ${o.bag_size} ${o.roast_profile}`,
        });
      }
    }
  }

  // Fetch Storefront & Wholesale orders
  if (!orderType || orderType === "storefront" || orderType === "wholesale") {
    let query = supabase.from("orders").select("*");

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_business.ilike.%${search}%`
      );
    }
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (roasterId) query = query.eq("roaster_id", roasterId);

    const { data: wholesaleOrders } = await query;

    // Fetch invoice statuses for invoice-based orders
    const invoiceIds = (wholesaleOrders || [])
      .map((wo) => wo.invoice_id)
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

    if (wholesaleOrders) {
      for (const wo of wholesaleOrders) {
        const roaster = roasterMap.get(wo.roaster_id);
        const woType: OrderType =
          wo.order_channel === "wholesale"
            ? "wholesale"
            : roaster?.storefront_type === "wholesale"
            ? "wholesale"
            : "storefront";

        if (orderType && orderType !== woType) continue;

        const items = wo.items as Array<{ name?: string; quantity?: number }>;
        const itemCount = Array.isArray(items) ? items.length : 0;
        const totalQty = Array.isArray(items)
          ? items.reduce((sum: number, it: { quantity?: number }) => sum + (it.quantity || 0), 0)
          : 0;

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
          orderType: woType,
          date: wo.created_at,
          customerName: wo.customer_name,
          customerEmail: wo.customer_email,
          customerBusiness: wo.customer_business,
          status: wo.status,
          paymentStatus: derivedPaymentStatus,
          total: wo.subtotal,
          roasterName: roaster?.business_name || null,
          roasterId: wo.roaster_id,
          artworkStatus: null,
          source: null,
          itemSummary: `${totalQty} items (${itemCount} products)`,
        });
      }
    }
  }

  // Sort
  const sortMultiplier = sortDir === "asc" ? 1 : -1;
  unified.sort((a, b) => {
    const key = sortKey as keyof UnifiedOrder;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * sortMultiplier;
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * sortMultiplier;
    }
    return 0;
  });

  // Paginate
  const total = unified.length;
  const start = (page - 1) * pageSize;
  const data = unified.slice(start, start + pageSize);

  return NextResponse.json({ data, total, page, pageSize });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, orderIds, orderType, value } = body as {
    action: string;
    orderIds: string[];
    orderType: OrderType;
    value?: string;
  };

  const supabase = createServerClient();

  if (action === "update_status" && value) {
    for (const id of orderIds) {
      if (orderType === "ghost") {
        await supabase.from("ghost_orders").update({ order_status: value }).eq("id", id);
      } else {
        await supabase.from("orders").update({ status: value }).eq("id", id);
      }

      await supabase.from("order_activity_log").insert({
        order_id: id,
        order_type: orderType,
        action: "status_change",
        description: `Status changed to ${value}`,
        actor_id: user.id,
        actor_name: user.email,
      });
    }
  }

  if (action === "cancel") {
    for (const id of orderIds) {
      if (orderType === "ghost") {
        await supabase.from("ghost_orders").update({ order_status: "Cancelled" }).eq("id", id);
      } else {
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
      }

      await supabase.from("order_activity_log").insert({
        order_id: id,
        order_type: orderType,
        action: "cancelled",
        description: "Order cancelled by admin",
        actor_id: user.id,
        actor_name: user.email,
      });
    }
  }

  return NextResponse.json({ success: true });
}
