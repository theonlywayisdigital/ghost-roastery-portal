import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { findOrCreatePerson } from "@/lib/people";
import {
  sendStorefrontOrderConfirmation,
  sendWholesaleOrderConfirmation,
  sendAdminNewOrderNotification,
} from "@/lib/email";
import type { EmailBranding } from "@/lib/email";
import { dispatchWebhook } from "@/lib/webhooks";

export interface ProcessOrderItem {
  productId: string;
  name?: string;
  unitAmount: number;
  quantity: number;
  unit?: string;
  variantId?: string;
  variantLabel?: string;
  // Compact format from metadata (Phase 3)
  p?: string;
  a?: number;
  q?: number;
  v?: string;
  l?: string;
}

export interface ProcessOrderParams {
  stripePaymentId: string;
  roasterId: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: object | null;
  items: ProcessOrderItem[];
  subtotalPence: number;
  platformFeePence: number;
  discountCodeId: string | null;
  discountCode: string | null;
  discountAmountPence: number;
  isWholesaleChannel: boolean;
  orderNotes?: string | null;
}

export interface ProcessOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  alreadyExists?: boolean;
  customerEmail?: string;
  customerName?: string;
}

/**
 * Normalize items from Stripe metadata.
 * Handles both verbose format (name, productId, unitAmount, quantity, unit)
 * and compact format (p, a, q, v, l) from Phase 3 metadata optimization.
 */
function normalizeItems(
  items: ProcessOrderItem[]
): Array<{ productId: string; unitAmount: number; quantity: number; variantId?: string; variantLabel?: string; name?: string; unit?: string }> {
  return items.map((item) => ({
    productId: item.p || item.productId,
    unitAmount: item.a ?? item.unitAmount,
    quantity: item.q ?? item.quantity,
    variantId: item.v || item.variantId,
    variantLabel: item.l || item.variantLabel,
    name: item.name,
    unit: item.unit,
  }));
}

/**
 * Shared order processing logic used by both confirm-order and webhook routes.
 * Handles idempotency, user creation, order insertion, ledger, stock, notifications, and emails.
 */
export async function processOrder(params: ProcessOrderParams): Promise<ProcessOrderResult> {
  const {
    stripePaymentId,
    roasterId,
    customerName,
    customerEmail,
    deliveryAddress,
    subtotalPence,
    platformFeePence,
    discountCodeId,
    discountCode,
    discountAmountPence,
    isWholesaleChannel,
  } = params;

  const supabase = createServerClient();

  // Normalize items (handle both verbose and compact metadata formats)
  const normalizedItems = normalizeItems(params.items);

  // Always fetch product data — we need names (for compact metadata) AND roasted_stock_id/weight_grams for stock deduction
  const productIds = Array.from(new Set(normalizedItems.map((item) => item.productId)));
  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit, roasted_stock_id, green_bean_id, weight_grams")
    .in("id", productIds);

  const productMap: Record<string, { name: string; unit: string; roasted_stock_id: string | null; green_bean_id: string | null; weight_grams: number | null }> = {};
  if (products) {
    for (const p of products) {
      productMap[p.id] = { name: p.name, unit: p.unit, roasted_stock_id: p.roasted_stock_id, green_bean_id: p.green_bean_id, weight_grams: p.weight_grams };
    }
    for (const item of normalizedItems) {
      if (!item.name && productMap[item.productId]) {
        item.name = productMap[item.productId].name;
        item.unit = productMap[item.productId].unit;
      }
    }
  }

  // Fetch variant weight_grams for items with variantId
  const variantIdsForWeight = normalizedItems.map((i) => i.variantId).filter(Boolean) as string[];
  let variantWeightMap: Record<string, number | null> = {};
  if (variantIdsForWeight.length > 0) {
    const { data: variantData } = await supabase
      .from("product_variants")
      .select("id, weight_grams")
      .in("id", variantIdsForWeight);
    if (variantData) {
      for (const v of variantData) {
        variantWeightMap[v.id] = v.weight_grams;
      }
    }
  }

  // Recalculate roaster payout based on discounted subtotal
  const effectiveSubtotalPence = subtotalPence - discountAmountPence;
  const roasterPayoutPence = effectiveSubtotalPence - platformFeePence;

  // 1. Idempotency check via stripe_payment_id
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_id", stripePaymentId)
    .maybeSingle();

  if (existingOrder) {
    return { success: true, orderId: existingOrder.id, alreadyExists: true, customerEmail, customerName };
  }

  // 2. Link to existing user account if one exists (no auto-creation for guests)
  let userId: string | null = null;

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", customerEmail.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    userId = existingUser.id;
  }

  // 3. Find or create person/contact record
  if (customerEmail) {
    const nameParts = (customerName || "").split(" ");
    await findOrCreatePerson(
      supabase,
      customerEmail,
      nameParts[0] || "",
      nameParts.slice(1).join(" ") || ""
    );
  }

  // Build items array for order insertion (with names, units, and stock data)
  const orderItems = normalizedItems.map((item) => {
    const productInfo = productMap[item.productId];
    // Variant weight takes priority over product weight
    const weightGrams = item.variantId && variantWeightMap[item.variantId] != null
      ? variantWeightMap[item.variantId]
      : productInfo?.weight_grams ?? null;
    const roastedStockId = productInfo?.roasted_stock_id ?? null;
    const greenBeanId = productInfo?.green_bean_id ?? null;

    return {
      productId: item.productId,
      name: item.name || "Item",
      unitAmount: item.unitAmount,
      quantity: item.quantity,
      unit: item.unit || "",
      ...(item.variantId ? { variantId: item.variantId } : {}),
      ...(item.variantLabel ? { variantLabel: item.variantLabel } : {}),
      ...(weightGrams != null ? { weightGrams } : {}),
      ...(roastedStockId ? { roastedStockId } : {}),
      ...(greenBeanId ? { greenBeanId } : {}),
    };
  });

  // 4. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      roaster_id: roasterId,
      customer_name: customerName,
      customer_email: customerEmail,
      delivery_address: deliveryAddress,
      items: orderItems,
      subtotal: subtotalPence / 100,
      platform_fee: platformFeePence / 100,
      roaster_payout: roasterPayoutPence / 100,
      stripe_payment_id: stripePaymentId,
      status: "paid",
      user_id: userId,
      discount_code_id: discountCodeId,
      discount_amount: discountAmountPence / 100,
      discount_code: discountCode,
      order_channel: isWholesaleChannel ? "wholesale" : "storefront",
      notes: params.orderNotes || null,
    })
    .select("id")
    .single();

  if (orderError) {
    // If unique constraint violation on stripe_payment_id, order was created by the other path
    if (orderError.code === "23505" && orderError.message?.includes("stripe_payment_id")) {
      const { data: raceOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_payment_id", stripePaymentId)
        .maybeSingle();
      return { success: true, orderId: raceOrder?.id, alreadyExists: true, customerEmail, customerName };
    }
    console.error("Failed to create order:", orderError);
    return { success: false, error: "Failed to create order." };
  }

  // 5. Platform fee ledger entry (awaited, not fire-and-forget)
  if (order && platformFeePence > 0) {
    const { error: ledgerError } = await supabase
      .from("platform_fee_ledger")
      .insert({
        roaster_id: roasterId,
        order_type: isWholesaleChannel ? "wholesale" : "storefront",
        reference_id: order.id,
        gross_amount: effectiveSubtotalPence / 100,
        fee_percent:
          effectiveSubtotalPence > 0
            ? Math.round((platformFeePence / effectiveSubtotalPence) * 10000) / 100
            : 0,
        fee_amount: platformFeePence / 100,
        net_to_roaster: roasterPayoutPence / 100,
        currency: "GBP",
        stripe_payment_id: stripePaymentId,
        status: "collected",
      });

    if (ledgerError) {
      console.error("Failed to write ledger entry:", ledgerError);
    }
  }

  // 6. Discount redemption + increment used_count
  if (discountCodeId && discountAmountPence >= 0 && discountCode && order) {
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

    await supabase.rpc("increment_discount_used_count", { discount_id: discountCodeId });
  }

  // 7. Stock decrement — product-level AND variant-level
  for (const item of normalizedItems) {
    await supabase.rpc("decrement_product_stock", {
      product_id: item.productId,
      qty: item.quantity,
    });

    if (item.variantId) {
      await supabase.rpc("decrement_variant_stock", {
        variant_id: item.variantId,
        qty: item.quantity,
      });
    }
  }

  // 7b. Roasted stock deduction — deduct KG based on item weight × quantity
  for (const item of orderItems) {
    const roastedStockId = (item as Record<string, unknown>).roastedStockId as string | undefined;
    const weightGrams = (item as Record<string, unknown>).weightGrams as number | undefined;
    if (roastedStockId && weightGrams && weightGrams > 0) {
      const deductKg = (weightGrams / 1000) * item.quantity;
      await supabase.rpc("deduct_roasted_stock", {
        stock_id: roastedStockId,
        qty_kg: deductKg,
      });
      // Get balance after deduction for movement record
      const { data: updatedStock } = await supabase
        .from("roasted_stock")
        .select("current_stock_kg")
        .eq("id", roastedStockId)
        .single();
      await supabase.from("roasted_stock_movements").insert({
        roaster_id: roasterId,
        roasted_stock_id: roastedStockId,
        movement_type: "order_deduction",
        quantity_kg: -deductKg,
        balance_after_kg: updatedStock?.current_stock_kg ?? 0,
        reference_id: order.id,
        reference_type: "order",
        notes: `Order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} × ${item.quantity}`,
      });
    }
  }

  // 7c. Green bean stock deduction — deduct KG based on item weight × quantity
  for (const item of orderItems) {
    const greenBeanId = (item as Record<string, unknown>).greenBeanId as string | undefined;
    const weightGrams = (item as Record<string, unknown>).weightGrams as number | undefined;
    if (greenBeanId && weightGrams && weightGrams > 0) {
      const deductKg = (weightGrams / 1000) * item.quantity;
      const { data: bean } = await supabase
        .from("green_beans")
        .select("current_stock_kg")
        .eq("id", greenBeanId)
        .single();
      if (bean) {
        const newStock = Math.max(0, (bean.current_stock_kg || 0) - deductKg);
        await supabase
          .from("green_beans")
          .update({ current_stock_kg: newStock })
          .eq("id", greenBeanId);
        await supabase.from("green_bean_movements").insert({
          roaster_id: roasterId,
          green_bean_id: greenBeanId,
          movement_type: "order_deduction",
          quantity_kg: -deductKg,
          balance_after_kg: newStock,
          reference_id: order.id,
          reference_type: "order",
          notes: `Order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} × ${item.quantity}`,
        });
      }
    }
  }

  // 8. Increment monthly wholesale orders — ONLY if wholesale
  if (isWholesaleChannel && roasterId && order) {
    await supabase
      .rpc("increment_monthly_wholesale_orders", { p_roaster_id: roasterId, p_count: 1 })
      .then(({ error }) => {
        if (error) console.error("Failed to increment wholesale order count:", error);
      });
  }

  // 9. Roaster notification
  const { data: roasterData } = await supabase
    .from("partner_roasters")
    .select("user_id")
    .eq("id", roasterId)
    .single();

  if (roasterData?.user_id) {
    const discountNote = discountCode ? ` (discount: ${discountCode})` : "";
    await createNotification({
      userId: roasterData.user_id,
      type: "new_order",
      title: "New order received",
      body: `${customerName || customerEmail} placed an order for £${(effectiveSubtotalPence / 100).toFixed(2)}${discountNote}.`,
      link: "/orders",
      metadata: { order_id: order.id },
    });
  }

  // 10. Order confirmation emails (idempotent via order_communications)
  if (order && customerEmail) {
    const orderNumber = order.id.slice(0, 8).toUpperCase();

    const { data: existingEmail } = await supabase
      .from("order_communications")
      .select("id")
      .eq("order_id", order.id)
      .eq("template_key", "order_confirmation")
      .maybeSingle();

    if (!existingEmail) {
      const { data: roasterBranding } = await supabase
        .from("partner_roasters")
        .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline, business_name, storefront_slug")
        .eq("id", roasterId)
        .single();

      const branding: EmailBranding | undefined = roasterBranding
        ? {
            logoUrl: roasterBranding.brand_logo_url,
            primaryColour: roasterBranding.brand_primary_colour || undefined,
            accentColour: roasterBranding.brand_accent_colour || undefined,
            headingFont: roasterBranding.brand_heading_font || undefined,
            bodyFont: roasterBranding.brand_body_font || undefined,
            tagline: roasterBranding.brand_tagline || undefined,
          }
        : undefined;

      const roasterName = roasterBranding?.business_name || "Your Roaster";
      const emailItems = orderItems.map((item) => ({
        name: item.name || "Item",
        quantity: item.quantity,
        price: (item.unitAmount / 100) * item.quantity,
      }));

      const storefrontSlug = roasterBranding?.storefront_slug || undefined;

      const sendFn = isWholesaleChannel
        ? sendWholesaleOrderConfirmation
        : sendStorefrontOrderConfirmation;

      sendFn({
        to: customerEmail,
        customerName: customerName || "",
        orderNumber,
        items: emailItems,
        total: effectiveSubtotalPence / 100,
        roasterName,
        branding,
        slug: storefrontSlug,
        orderId: order.id,
      })
        .then(() => {
          supabase
            .from("order_communications")
            .insert({
              order_id: order.id,
              order_type: isWholesaleChannel ? "wholesale" : "storefront",
              template_key: "order_confirmation",
              subject: `Order confirmed — #${orderNumber}`,
              body: `Automated order confirmation sent to ${customerEmail}`,
              recipient_email: customerEmail,
            })
            .then(({ error }) => {
              if (error) console.error("Failed to log order confirmation email:", error);
            });
        })
        .catch((err) => console.error("Failed to send order confirmation email:", err));

      // 11. Admin notification
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

  // 12. Fire automation triggers + update contact activity
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

  // Dispatch order.placed webhook
  dispatchWebhook(roasterId, "order.placed", {
    order: {
      id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase(),
      customer_name: customerName,
      customer_email: customerEmail,
      delivery_address: deliveryAddress,
      items: orderItems,
      subtotal: subtotalPence / 100,
      platform_fee: platformFeePence / 100,
      roaster_payout: roasterPayoutPence / 100,
      discount_code: discountCode || null,
      discount_amount: discountAmountPence / 100,
      order_channel: isWholesaleChannel ? "wholesale" : "storefront",
      status: "paid",
      notes: params.orderNotes || null,
      created_at: new Date().toISOString(),
    },
  });

  return { success: true, orderId: order.id, customerEmail, customerName };
}
