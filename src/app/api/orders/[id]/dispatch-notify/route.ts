import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  sendOrderDispatchedEmail,
} from "@/lib/email";
import type { EmailBranding } from "@/lib/email";
import { pushDispatchToChannels } from "@/lib/ecommerce-dispatch-sync";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST: Send dispatch notifications for an order that was already marked dispatched.
 * Called after the 15-second undo window expires.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Verify order is still dispatched (wasn't undone)
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, user_id, customer_name, customer_email, tracking_number, tracking_carrier, order_channel, subtotal")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "dispatched") {
    // Order was undone — skip notifications
    return NextResponse.json({ skipped: true, reason: "Order is no longer dispatched" });
  }

  // Send in-app notification
  if (order.user_id) {
    await createNotification({
      userId: order.user_id,
      type: "order_status_updated",
      title: "Order dispatched",
      body: `Your order from ${roaster.business_name} has been dispatched.`,
      link: "/my-orders",
      metadata: { order_id: id, new_status: "dispatched" },
    });
  }

  // Send dispatch email (idempotent)
  const templateKey = "order_dispatched";
  const { data: existingEmail } = await supabase
    .from("order_communications")
    .select("id")
    .eq("order_id", id)
    .eq("template_key", templateKey)
    .maybeSingle();

  if (!existingEmail && order.customer_email) {
    const { data: roasterBranding } = await supabase
      .from("roasters")
      .select("brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline, business_name")
      .eq("id", roaster.id)
      .single();

    const branding: EmailBranding | undefined = roasterBranding ? {
      logoUrl: roasterBranding.brand_logo_url,
      logoSize: roasterBranding.storefront_logo_size || "medium",
      buttonColour: roasterBranding.storefront_button_colour || undefined,
      buttonTextColour: roasterBranding.storefront_button_text_colour || undefined,
      buttonStyle: (roasterBranding.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
      primaryColour: roasterBranding.brand_primary_colour || undefined,
      accentColour: roasterBranding.brand_accent_colour || undefined,
      headingFont: roasterBranding.brand_heading_font || undefined,
      bodyFont: roasterBranding.brand_body_font || undefined,
      tagline: roasterBranding.brand_tagline || undefined,
    } : undefined;

    const roasterName = roasterBranding?.business_name || roaster.business_name || "Your Roaster";
    const orderNumber = id.slice(0, 8).toUpperCase();

    sendOrderDispatchedEmail({
      to: order.customer_email,
      customerName: order.customer_name || "",
      orderNumber,
      trackingNumber: order.tracking_number || null,
      trackingCarrier: order.tracking_carrier || null,
      roasterName,
      branding,
    }).then(() => {
      supabase.from("order_communications").insert({
        order_id: id,
        order_type: order.order_channel === "wholesale" ? "wholesale" : "storefront",
        template_key: templateKey,
        subject: `Order dispatched — #${orderNumber}`,
        body: `Automated dispatched notification sent to ${order.customer_email}`,
        recipient_email: order.customer_email,
      }).then(({ error }) => { if (error) console.error(`Failed to log ${templateKey} email:`, error); });
    }).catch((err) => console.error(`Failed to send ${templateKey} email:`, err));
  }

  // Push dispatch to connected ecommerce channel
  pushDispatchToChannels(id).catch((err) =>
    console.error("[dispatch-sync] Post-dispatch sync failed:", err)
  );

  // Fire automation trigger
  if (order.customer_email) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("roaster_id", roaster.id)
      .eq("email", order.customer_email.toLowerCase())
      .single();

    if (contact) {
      fireAutomationTrigger({
        trigger_type: "order_status_changed",
        roaster_id: roaster.id as string,
        contact_id: contact.id,
        event_data: { new_status: "dispatched" },
        context: { order: { subtotal: order.subtotal } },
      }).catch(() => {});
      updateContactActivity(contact.id).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
