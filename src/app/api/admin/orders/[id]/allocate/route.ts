import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { sendPartnerAllocationEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Get the order
  const { data: order } = await supabase
    .from("ghost_orders")
    .select("id, delivery_address, partner_roaster_id, order_status")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.partner_roaster_id) {
    return NextResponse.json({ error: "Order already has a partner allocated" }, { status: 400 });
  }

  // Extract delivery country from address
  const addr = order.delivery_address as Record<string, string> | null;
  const countryCode = addr?.country || "GB";

  // Use the get_partner_for_order RPC to find a matching partner
  const { data: match, error: rpcError } = await supabase.rpc("get_partner_for_order", {
    p_country_code: countryCode,
  });

  if (rpcError || !match || match.length === 0) {
    return NextResponse.json(
      { error: "No partner found for this delivery territory" },
      { status: 404 }
    );
  }

  const partnerId = match[0].roaster_id;

  // Allocate partner to order
  const { error: updateError } = await supabase
    .from("ghost_orders")
    .update({
      partner_roaster_id: partnerId,
      order_status: "Allocated",
    })
    .eq("id", id);

  if (updateError) {
    console.error("Partner allocation error:", updateError);
    return NextResponse.json({ error: "Failed to allocate partner" }, { status: 500 });
  }

  // Create roaster_order entry
  const { error: roasterOrderError } = await supabase.from("roaster_orders").insert({
    order_id: id,
    roaster_id: partnerId,
    status: "pending",
  });

  if (roasterOrderError) {
    console.error("Failed to create roaster_order entry:", roasterOrderError);
    return NextResponse.json({ error: "Failed to create roaster order entry" }, { status: 500 });
  }

  // Log activity + fetch partner details for notifications
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("business_name, email, contact_name, user_id")
    .eq("id", partnerId)
    .single();

  await supabase.from("order_activity_log").insert({
    order_id: id,
    order_type: "ghost",
    action: "updated",
    description: `Partner allocated: ${roaster?.business_name || "Unknown"}`,
    actor_id: user.id,
    actor_name: user.email,
  });

  // Fetch order number for notifications
  const { data: orderData } = await supabase
    .from("ghost_orders")
    .select("order_number")
    .eq("id", id)
    .single();

  const orderNumber = orderData?.order_number || id.slice(0, 8).toUpperCase();

  // Send partner allocation email
  if (roaster?.email) {
    sendPartnerAllocationEmail({
      to: roaster.email,
      partnerName: roaster.contact_name || roaster.business_name || "Partner",
      orderNumber,
    }).then(() => {
      supabase.from("order_communications").insert({
        order_id: id,
        order_type: "ghost",
        template_key: "partner_allocation",
        subject: `New order allocated — #${orderNumber}`,
        body: `Automated partner allocation notification sent to ${roaster.email}`,
        recipient_email: roaster.email,
      }).then(({ error }) => { if (error) console.error("Failed to log partner allocation email:", error); });
    }).catch((err) => console.error("Failed to send partner allocation email:", err));
  }

  // Send in-app notification to partner
  if (roaster?.user_id) {
    createNotification({
      userId: roaster.user_id,
      type: "new_order",
      title: "New order allocated",
      body: `Ghost Roastery order #${orderNumber} has been allocated to you for fulfilment.`,
      link: "/orders",
      metadata: { order_id: id },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, partnerId });
}
