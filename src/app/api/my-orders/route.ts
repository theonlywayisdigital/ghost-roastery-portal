import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch Roastery Platform orders
  const { data: ghostOrders } = await supabase
    .from("ghost_orders")
    .select("id, order_number, bag_size, bag_colour, roast_profile, grind, quantity, total_price, order_status, mockup_image_url, brand_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch wholesale/storefront orders where customer email matches
  const { data: wholesaleOrders } = await supabase
    .from("orders")
    .select("id, order_channel, status, subtotal, customer_name, customer_email, items, created_at, roaster_id, tracking_number, tracking_carrier, standing_order_id")
    .eq("customer_email", user.email)
    .order("created_at", { ascending: false });

  // Unify into a single list
  const unified = [
    ...(ghostOrders || []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      orderType: "ghost" as const,
      status: o.order_status,
      total: o.total_price,
      itemSummary: `${o.quantity}× ${o.bag_size} ${o.bag_colour} — ${o.roast_profile}`,
      imageUrl: o.mockup_image_url,
      brandName: o.brand_name,
      createdAt: o.created_at,
    })),
    ...(wholesaleOrders || []).map((o) => {
      const items = (o.items as Array<{ name?: string; product_name?: string; quantity?: number }>) || [];
      const firstItem = items[0];
      const itemName = firstItem?.name || firstItem?.product_name || "Products";
      const itemCount = items.length;
      return {
        id: o.id,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        orderType: (o.order_channel === "wholesale" ? "wholesale" : "storefront") as "wholesale" | "storefront",
        status: o.status,
        total: o.subtotal,
        itemSummary: itemCount > 1 ? `${itemName} + ${itemCount - 1} more` : itemName,
        imageUrl: null,
        brandName: null,
        createdAt: o.created_at,
        standingOrderId: o.standing_order_id || null,
      };
    }),
  ];

  // Sort by date descending
  unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ orders: unified });
}
