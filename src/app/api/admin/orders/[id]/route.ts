import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  sendOrderDispatchedEmail,
  sendOrderDeliveredEmail,
} from "@/lib/email";
import type { EmailBranding } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    orderType,
    status,
    artworkStatus,
    trackingNumber,
    trackingCarrier,
    cancellationReason,
    notes,
  } = body as {
    orderType: string;
    status?: string;
    artworkStatus?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    cancellationReason?: string;
    notes?: string;
  };

  const supabase = createServerClient();
  const isGhost = orderType === "ghost";
  const table = isGhost ? "ghost_orders" : "orders";

  // Build update payload
  const updates: Record<string, unknown> = {};
  const activityEntries: { action: string; description: string }[] = [];

  if (status !== undefined) {
    if (isGhost) {
      updates.order_status = status;
    } else {
      updates.status = status;
    }

    // Set timestamps for wholesale statuses
    if (!isGhost) {
      const now = new Date().toISOString();
      if (status === "confirmed") updates.confirmed_at = now;
      if (status === "dispatched") updates.dispatched_at = now;
      if (status === "delivered") updates.delivered_at = now;
      if (status === "cancelled") updates.cancelled_at = now;
    }

    // Handle cancellation reason
    if (status === "cancelled" || status === "Cancelled") {
      if (cancellationReason) {
        updates.cancellation_reason = cancellationReason;
      }
      activityEntries.push({
        action: "cancelled",
        description: `Order cancelled${cancellationReason ? `: ${cancellationReason}` : ""}`,
      });
    } else {
      activityEntries.push({
        action: "status_change",
        description: `Status changed to ${status}`,
      });
    }
  }

  if (artworkStatus !== undefined && isGhost) {
    updates.artwork_status = artworkStatus;
    activityEntries.push({
      action: artworkStatus === "approved" ? "approved" : artworkStatus === "needs_edit" ? "declined" : "updated",
      description: `Artwork status changed to ${artworkStatus.replace(/_/g, " ")}`,
    });
  }

  if (trackingNumber !== undefined) {
    updates.tracking_number = trackingNumber;
    if (!activityEntries.some((e) => e.action === "shipped")) {
      activityEntries.push({
        action: "shipped",
        description: `Tracking number set: ${trackingNumber}${trackingCarrier ? ` (${trackingCarrier})` : ""}`,
      });
    }
  }

  if (trackingCarrier !== undefined) {
    updates.tracking_carrier = trackingCarrier;
  }

  if (notes !== undefined) {
    updates.special_instructions = notes;
    activityEntries.push({
      action: "updated",
      description: "Order notes updated",
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  // Apply update
  const { error: updateError } = await supabase
    .from(table)
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Admin order update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }

  // Log activities
  for (const entry of activityEntries) {
    await supabase.from("order_activity_log").insert({
      order_id: id,
      order_type: orderType || "ghost",
      action: entry.action,
      description: entry.description,
      actor_id: user.id,
      actor_name: user.email,
    });
  }

  // Send dispatch/delivery emails
  if (status === "dispatched" || status === "Dispatched" || status === "delivered" || status === "Delivered") {
    const templateKey = status === "dispatched" || status === "Dispatched" ? "order_dispatched" : "order_delivered";

    // Check idempotency
    const { data: existingEmail } = await supabase
      .from("order_communications")
      .select("id")
      .eq("order_id", id)
      .eq("template_key", templateKey)
      .maybeSingle();

    if (!existingEmail) {
      // Fetch order details for email — separate queries for type safety
      let emailTo = "";
      let emailCustomerName = "";
      let emailOrderNumber = "";
      let roasterIdForBranding: string | null = null;
      let emailTrackingNum: string | null = null;
      let emailTrackingCar: string | null = null;

      if (isGhost) {
        const { data: ghostOrder } = await supabase
          .from("ghost_orders")
          .select("customer_email, customer_name, order_number, partner_roaster_id")
          .eq("id", id)
          .single();
        if (ghostOrder) {
          emailTo = ghostOrder.customer_email || "";
          emailCustomerName = ghostOrder.customer_name || "";
          emailOrderNumber = ghostOrder.order_number || id.slice(0, 8).toUpperCase();
          roasterIdForBranding = ghostOrder.partner_roaster_id;
        }
      } else {
        const { data: wsOrder } = await supabase
          .from("orders")
          .select("customer_email, customer_name, roaster_id, tracking_number, tracking_carrier")
          .eq("id", id)
          .single();
        if (wsOrder) {
          emailTo = wsOrder.customer_email || "";
          emailCustomerName = wsOrder.customer_name || "";
          emailOrderNumber = id.slice(0, 8).toUpperCase();
          roasterIdForBranding = wsOrder.roaster_id;
          emailTrackingNum = wsOrder.tracking_number;
          emailTrackingCar = wsOrder.tracking_carrier;
        }
      }

      if (emailTo) {
        let branding: EmailBranding | undefined;
        let roasterName = "Roastery Platform";

        if (isGhost) {
          // Ghost orders use platform branding
          const { data: settings } = await supabase
            .from("platform_settings")
            .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
            .limit(1)
            .single();

          if (settings) {
            branding = {
              logoUrl: settings.brand_logo_url,
              primaryColour: settings.brand_primary_colour || undefined,
              accentColour: settings.brand_accent_colour || undefined,
              headingFont: settings.brand_heading_font || undefined,
              bodyFont: settings.brand_body_font || undefined,
              tagline: settings.brand_tagline || undefined,
            };
          }
        } else if (roasterIdForBranding) {
          // Storefront/wholesale use roaster branding
          const { data: roasterData } = await supabase
            .from("partner_roasters")
            .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline, business_name")
            .eq("id", roasterIdForBranding)
            .single();

          if (roasterData) {
            roasterName = roasterData.business_name || "Your Roaster";
            branding = {
              logoUrl: roasterData.brand_logo_url,
              primaryColour: roasterData.brand_primary_colour || undefined,
              accentColour: roasterData.brand_accent_colour || undefined,
              headingFont: roasterData.brand_heading_font || undefined,
              bodyFont: roasterData.brand_body_font || undefined,
              tagline: roasterData.brand_tagline || undefined,
            };
          }
        }

        const finalTrackingNumber = trackingNumber || emailTrackingNum || null;
        const finalTrackingCarrier = trackingCarrier || emailTrackingCar || null;

        const sendFn = status === "dispatched" || status === "Dispatched"
          ? () => sendOrderDispatchedEmail({
              to: emailTo,
              customerName: emailCustomerName,
              orderNumber: emailOrderNumber,
              trackingNumber: finalTrackingNumber,
              trackingCarrier: finalTrackingCarrier,
              roasterName,
              branding,
            })
          : () => sendOrderDeliveredEmail({
              to: emailTo,
              customerName: emailCustomerName,
              orderNumber: emailOrderNumber,
              roasterName,
              branding,
            });

        sendFn().then(() => {
          supabase.from("order_communications").insert({
            order_id: id,
            order_type: orderType || "ghost",
            template_key: templateKey,
            subject: `Order ${templateKey === "order_dispatched" ? "dispatched" : "delivered"} — #${emailOrderNumber}`,
            body: `Automated ${templateKey === "order_dispatched" ? "dispatch" : "delivery"} notification sent to ${emailTo}`,
            recipient_email: emailTo,
            sent_by: user.id,
          }).then(({ error }) => { if (error) console.error(`Failed to log ${templateKey} email:`, error); });
        }).catch((err) => console.error(`Failed to send ${templateKey} email:`, err));
      }
    }
  }

  return NextResponse.json({ success: true });
}
