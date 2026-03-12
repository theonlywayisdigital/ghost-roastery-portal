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
  const search = params.get("search") || "";
  const status = params.get("status") || "";
  const paymentStatus = params.get("paymentStatus") || "";
  const orderType = (params.get("orderType") || "") as OrderType | "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const roasterId = params.get("roasterId") || "";

  const supabase = createServerClient();
  const unified: UnifiedOrder[] = [];

  // Fetch roasters lookup
  const { data: roastersList } = await supabase
    .from("partner_roasters")
    .select("id, business_name, storefront_type");
  const roasterMap = new Map(
    (roastersList || []).map((r) => [r.id, r])
  );

  if (!orderType || orderType === "ghost") {
    let query = supabase.from("ghost_orders").select("*");

    if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    if (status) query = query.eq("order_status", status);
    if (paymentStatus) query = query.eq("payment_status", paymentStatus);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (roasterId) query = query.eq("roaster_id", roasterId);

    const { data: orders } = await query;
    if (orders) {
      for (const o of orders) {
        const roaster = o.roaster_id ? roasterMap.get(o.roaster_id) : null;
        unified.push({
          id: o.id, orderNumber: o.order_number, orderType: "ghost", date: o.created_at,
          customerName: o.customer_name, customerEmail: o.customer_email,
          customerBusiness: o.brand_name, status: o.order_status,
          paymentStatus: o.payment_status, total: o.total_price,
          roasterName: roaster?.business_name || null, roasterId: o.roaster_id,
          artworkStatus: o.artwork_status ?? null, source: o.order_source ?? null,
          itemSummary: `${o.quantity}x ${o.bag_size} ${o.roast_profile}`,
        });
      }
    }
  }

  if (!orderType || orderType === "storefront" || orderType === "wholesale") {
    let query = supabase.from("orders").select("*");

    if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    if (status) query = query.eq("status", status);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    if (roasterId) query = query.eq("roaster_id", roasterId);

    const { data: wholesaleOrders } = await query;
    if (wholesaleOrders) {
      for (const wo of wholesaleOrders) {
        const roaster = roasterMap.get(wo.roaster_id);
        const woType: OrderType = roaster?.storefront_type === "wholesale" ? "wholesale" : "storefront";
        if (orderType && orderType !== woType) continue;
        unified.push({
          id: wo.id, orderNumber: wo.id.slice(0, 8).toUpperCase(), orderType: woType,
          date: wo.created_at, customerName: wo.customer_name, customerEmail: wo.customer_email,
          customerBusiness: wo.customer_business, status: wo.status,
          paymentStatus: wo.stripe_payment_id ? "paid" : "pending", total: wo.subtotal,
          roasterName: roaster?.business_name || null, roasterId: wo.roaster_id,
          artworkStatus: null, source: null, itemSummary: "",
        });
      }
    }
  }

  unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const headers = ["Order Number","Type","Date","Customer Name","Customer Email","Business","Status","Payment","Total","Roaster","Items"];
  const rows = unified.map((o) => [
    o.orderNumber, o.orderType, new Date(o.date).toISOString().split("T")[0],
    o.customerName || "", o.customerEmail, o.customerBusiness || "",
    o.status, o.paymentStatus, o.total.toFixed(2), o.roasterName || "", o.itemSummary,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
