import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { findOrCreatePerson } from "@/lib/people";
import {
  sendStorefrontOrderConfirmation,
  sendWholesaleOrderConfirmation,
  sendAdminNewOrderNotification,
} from "@/lib/email";
import type { EmailBranding } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing session_id." },
        { status: 400 }
      );
    }

    // Retrieve the Stripe Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed." },
        { status: 400 }
      );
    }

    const metadata = session.metadata || {};
    const roasterId = metadata.roaster_id;
    const customerName = metadata.customer_name;
    const customerEmail = metadata.customer_email;
    const deliveryAddress = metadata.delivery_address
      ? JSON.parse(metadata.delivery_address)
      : null;
    const items = metadata.items ? JSON.parse(metadata.items) : [];
    const subtotalPence = parseInt(metadata.subtotal_pence || "0");
    const platformFeePence = parseInt(metadata.platform_fee_pence || "0");
    const stripePaymentId = (session.payment_intent as string) || session.id;

    // Order channel from wholesale access
    const isWholesaleChannel = metadata.wholesale === "true";

    // Discount metadata
    const discountCodeId = metadata.discount_code_id || null;
    const discountCodeStr = metadata.discount_code || null;
    const discountAmountPence = parseInt(metadata.discount_amount_pence || "0");

    // Recalculate roaster payout based on discounted subtotal
    const effectiveSubtotalPence = subtotalPence - discountAmountPence;
    const roasterPayoutPence = effectiveSubtotalPence - platformFeePence;

    if (!roasterId || !customerEmail) {
      return NextResponse.json(
        { error: "Invalid session metadata." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Idempotency: check if order already exists for this payment
    const { data: existingOrder } = await supabase
      .from("wholesale_orders")
      .select("id")
      .eq("stripe_payment_id", stripePaymentId)
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({ success: true, orderId: existingOrder.id });
    }

    // Find or create user account
    let userId: string | null = null;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", customerEmail.toLowerCase())
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: customerEmail,
          email_confirm: true,
          user_metadata: {
            full_name: customerName,
          },
        });

      if (authError) {
        console.error("Failed to create user:", authError);
      } else if (authData.user) {
        userId = authData.user.id;

        await supabase.from("users").insert({
          id: userId,
          email: customerEmail.toLowerCase(),
          full_name: customerName,
        });
      }
    }

    // Ensure people record exists for customer (fire-and-forget)
    if (customerEmail) {
      const nameParts = (customerName || "").split(" ");
      findOrCreatePerson(supabase, customerEmail, nameParts[0] || "", nameParts.slice(1).join(" ") || "").catch(() => {});
    }

    // Grant retail_buyer role
    if (userId) {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role_id", "retail_buyer")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role_id: "retail_buyer",
        });
      }
    }

    // Create order with discount fields
    const { data: order, error: orderError } = await supabase
      .from("wholesale_orders")
      .insert({
        roaster_id: roasterId,
        customer_name: customerName,
        customer_email: customerEmail,
        delivery_address: deliveryAddress,
        items,
        subtotal: subtotalPence / 100,
        platform_fee: platformFeePence / 100,
        roaster_payout: roasterPayoutPence / 100,
        stripe_payment_id: stripePaymentId,
        status: "paid",
        user_id: userId,
        discount_code_id: discountCodeId,
        discount_amount: discountAmountPence / 100,
        discount_code: discountCodeStr,
        order_channel: isWholesaleChannel ? "wholesale" : "storefront",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Failed to create order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order." },
        { status: 500 }
      );
    }

    // Record platform fee ledger entry
    if (order && platformFeePence > 0) {
      supabase
        .from("platform_fee_ledger")
        .insert({
          roaster_id: roasterId,
          order_type: "storefront",
          reference_id: order.id,
          gross_amount: subtotalPence / 100,
          fee_percent:
            subtotalPence > 0
              ? Math.round((platformFeePence / subtotalPence) * 10000) / 100
              : 0,
          fee_amount: platformFeePence / 100,
          net_to_roaster: roasterPayoutPence / 100,
          currency: "GBP",
          stripe_payment_id: stripePaymentId,
          status: "collected",
        })
        .then(({ error: ledgerError }) => {
          if (ledgerError)
            console.error("Failed to write ledger entry:", ledgerError);
        });
    }

    // Create discount redemption record and increment used_count
    if (discountCodeId && discountAmountPence >= 0 && discountCodeStr) {
      // Find contact by email
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", customerEmail.toLowerCase())
        .eq("roaster_id", roasterId)
        .maybeSingle();

      await supabase.from("discount_redemptions").insert({
        discount_code_id: discountCodeId,
        order_id: order.id,
        contact_id: contact?.id || null,
        customer_email: customerEmail.toLowerCase(),
        order_value: subtotalPence / 100,
        discount_amount: discountAmountPence / 100,
      });

      // Increment used_count
      const { data: codeData } = await supabase
        .from("discount_codes")
        .select("used_count")
        .eq("id", discountCodeId)
        .single();

      if (codeData) {
        await supabase
          .from("discount_codes")
          .update({ used_count: (codeData.used_count || 0) + 1 })
          .eq("id", discountCodeId);
      }
    }

    // Decrement stock for tracked products
    for (const item of items) {
      const { data: product } = await supabase
        .from("wholesale_products")
        .select("retail_stock_count, track_stock")
        .eq("id", item.productId)
        .single();

      if (product?.track_stock && product.retail_stock_count != null) {
        await supabase
          .from("wholesale_products")
          .update({
            retail_stock_count: Math.max(
              0,
              product.retail_stock_count - item.quantity
            ),
          })
          .eq("id", item.productId);
      }
    }

    // Notify the roaster about the new order
    const { data: roasterData } = await supabase
      .from("partner_roasters")
      .select("user_id")
      .eq("id", roasterId)
      .single();

    if (roasterData?.user_id) {
      const discountNote = discountCodeStr ? ` (discount: ${discountCodeStr})` : "";
      await createNotification({
        userId: roasterData.user_id,
        type: "new_order",
        title: "New order received",
        body: `${customerName || customerEmail} placed an order for £${(effectiveSubtotalPence / 100).toFixed(2)}${discountNote}.`,
        link: "/orders",
        metadata: { order_id: order.id },
      });
    }

    // Send order confirmation emails (idempotent via order_communications)
    if (order && customerEmail) {
      const orderNumber = order.id.slice(0, 8).toUpperCase();

      // Check if confirmation email already sent
      const { data: existingEmail } = await supabase
        .from("order_communications")
        .select("id")
        .eq("order_id", order.id)
        .eq("template_key", "order_confirmation")
        .maybeSingle();

      if (!existingEmail) {
        // Fetch roaster branding
        const { data: roasterBranding } = await supabase
          .from("partner_roasters")
          .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline, business_name")
          .eq("id", roasterId)
          .single();

        const branding: EmailBranding | undefined = roasterBranding ? {
          logoUrl: roasterBranding.brand_logo_url,
          primaryColour: roasterBranding.brand_primary_colour || undefined,
          accentColour: roasterBranding.brand_accent_colour || undefined,
          headingFont: roasterBranding.brand_heading_font || undefined,
          bodyFont: roasterBranding.brand_body_font || undefined,
          tagline: roasterBranding.brand_tagline || undefined,
        } : undefined;

        const roasterName = roasterBranding?.business_name || "Your Roaster";
        const emailItems = items.map((item: { name?: string; productName?: string; quantity: number; price?: number; unitPrice?: number }) => ({
          name: item.name || item.productName || "Item",
          quantity: item.quantity,
          price: ((item.price || item.unitPrice || 0) * item.quantity),
        }));

        const sendFn = isWholesaleChannel ? sendWholesaleOrderConfirmation : sendStorefrontOrderConfirmation;
        sendFn({
          to: customerEmail,
          customerName: customerName || "",
          orderNumber,
          items: emailItems,
          total: effectiveSubtotalPence / 100,
          roasterName,
          branding,
        }).then(() => {
          // Log to order_communications
          supabase.from("order_communications").insert({
            order_id: order.id,
            order_type: isWholesaleChannel ? "wholesale" : "storefront",
            template_key: "order_confirmation",
            subject: `Order confirmed — #${orderNumber}`,
            body: `Automated order confirmation sent to ${customerEmail}`,
            recipient_email: customerEmail,
          }).then(({ error }) => { if (error) console.error("Failed to log order confirmation email:", error); });
        }).catch((err) => console.error("Failed to send order confirmation email:", err));

        // Admin notification
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (adminEmail) {
          sendAdminNewOrderNotification({
            to: adminEmail,
            customerName: customerName || "",
            customerEmail,
            orderNumber,
            total: effectiveSubtotalPence / 100,
            orderChannel: isWholesaleChannel ? "wholesale" : "storefront",
            roasterName,
          }).catch((err) => console.error("Failed to send admin notification:", err));
        }
      }
    }

    // Fire automation triggers for order placed
    if (customerEmail) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", roasterId)
        .eq("email", customerEmail.toLowerCase())
        .maybeSingle();

      if (contact) {
        fireAutomationTrigger({
          trigger_type: "order_placed",
          roaster_id: roasterId,
          contact_id: contact.id,
          context: { order: { subtotal: subtotalPence / 100, id: order.id } },
        }).catch(() => {});

        // Also fire discount_code_redeemed if applicable
        if (discountCodeId) {
          fireAutomationTrigger({
            trigger_type: "discount_code_redeemed",
            roaster_id: roasterId,
            contact_id: contact.id,
            event_data: { discount_code_id: discountCodeId },
          }).catch(() => {});
        }

        updateContactActivity(contact.id).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Confirm order error:", error);
    return NextResponse.json(
      { error: "Failed to confirm order." },
      { status: 500 }
    );
  }
}
