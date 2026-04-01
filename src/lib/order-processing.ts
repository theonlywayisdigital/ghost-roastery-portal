import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { findOrCreatePerson, findOrCreateContact, splitName } from "@/lib/people";
import {
  sendStorefrontOrderConfirmation,
  sendWholesaleOrderConfirmation,
  sendAdminNewOrderNotification,
} from "@/lib/email";
import type { EmailBranding } from "@/lib/email";
import { dispatchWebhook } from "@/lib/webhooks";
import { generateInvoiceNumber, generateAccessToken } from "@/lib/invoice-utils";
import { syncToXero, pushInvoiceToXero } from "@/lib/xero";
import { syncToSage, pushInvoiceToSage } from "@/lib/sage";
import { syncToQuickBooks, pushInvoiceToQuickBooks } from "@/lib/quickbooks";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

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
    .select("id, name, unit, roasted_stock_id, green_bean_id, weight_grams, is_blend")
    .in("id", productIds);

  const productMap: Record<string, { name: string; unit: string; roasted_stock_id: string | null; green_bean_id: string | null; weight_grams: number | null; is_blend: boolean }> = {};
  // Fetch blend components for any blend products
  const blendComponentMap: Record<string, { roasted_stock_id: string; percentage: number }[]> = {};
  if (products) {
    for (const p of products) {
      productMap[p.id] = { name: p.name, unit: p.unit, roasted_stock_id: p.roasted_stock_id, green_bean_id: p.green_bean_id, weight_grams: p.weight_grams, is_blend: p.is_blend ?? false };
    }
    const blendProductIds = products.filter((p) => p.is_blend).map((p) => p.id);
    if (blendProductIds.length > 0) {
      const { data: components } = await supabase
        .from("blend_components")
        .select("product_id, roasted_stock_id, percentage")
        .in("product_id", blendProductIds);
      if (components) {
        for (const c of components) {
          if (!blendComponentMap[c.product_id]) blendComponentMap[c.product_id] = [];
          blendComponentMap[c.product_id].push({ roasted_stock_id: c.roasted_stock_id, percentage: Number(c.percentage) });
        }
      }
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
  const { firstName, lastName } = splitName(customerName);

  if (customerEmail) {
    await findOrCreatePerson(supabase, customerEmail, firstName, lastName);
  }

  // 3b. Find or create contact record (for roaster CRM)
  const contactId = await findOrCreateContact(
    supabase,
    roasterId,
    customerEmail,
    firstName,
    lastName,
    deliveryAddress as Record<string, string> | null
  );

  // Build items array for order insertion (with names, units, and stock data)
  const orderItems = normalizedItems.map((item) => {
    const productInfo = productMap[item.productId];
    // Variant weight takes priority over product weight
    const weightGrams = item.variantId && variantWeightMap[item.variantId] != null
      ? variantWeightMap[item.variantId]
      : productInfo?.weight_grams ?? null;
    const isBlend = productInfo?.is_blend ?? false;
    const roastedStockId = !isBlend ? (productInfo?.roasted_stock_id ?? null) : null;
    const greenBeanId = productInfo?.green_bean_id ?? null;
    const blendComponents = isBlend ? (blendComponentMap[item.productId] || []) : undefined;

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
      ...(blendComponents && blendComponents.length > 0 ? { blendComponents } : {}),
    };
  });

  // 4. Insert order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      roaster_id: roasterId,
      customer_name: customerName,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_email: customerEmail,
      contact_id: contactId,
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
    await supabase.from("discount_redemptions").insert({
      discount_code_id: discountCodeId,
      order_id: order.id,
      contact_id: contactId || null,
      customer_email: customerEmail.toLowerCase(),
      order_value: subtotalPence / 100,
      discount_amount: discountAmountPence / 100,
    });

    await supabase.rpc("increment_discount_used_count", { discount_id: discountCodeId });
  }

  // 7. Stock decrement — product-level AND variant-level
  // Only decrement manual retail_stock_count when the product is NOT
  // linked to a roasted stock pool. When roasted stock is linked it is
  // the source of truth and the KG-based deduction in 7b handles it.
  for (const item of normalizedItems) {
    const productInfo = productMap[item.productId];
    const hasRoastedStock =
      productInfo?.roasted_stock_id ||
      (productInfo?.is_blend && blendComponentMap[item.productId]?.length > 0);

    if (!hasRoastedStock) {
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
  }

  // 7b. Roasted stock deduction — deduct KG based on item weight × quantity
  for (const item of orderItems) {
    const itemData = item as Record<string, unknown>;
    const weightGrams = itemData.weightGrams as number | undefined;
    const itemBlendComponents = itemData.blendComponents as { roasted_stock_id: string; percentage: number }[] | undefined;

    if (itemBlendComponents && itemBlendComponents.length > 0 && weightGrams && weightGrams > 0) {
      // Blend product: deduct proportionally from each component
      const totalKg = (weightGrams / 1000) * item.quantity;
      for (const comp of itemBlendComponents) {
        const compKg = totalKg * (comp.percentage / 100);
        await supabase.rpc("deduct_roasted_stock", {
          stock_id: comp.roasted_stock_id,
          qty_kg: compKg,
        });
        const { data: updatedStock } = await supabase
          .from("roasted_stock")
          .select("current_stock_kg")
          .eq("id", comp.roasted_stock_id)
          .single();
        await supabase.from("roasted_stock_movements").insert({
          roaster_id: roasterId,
          roasted_stock_id: comp.roasted_stock_id,
          movement_type: "order_deduction",
          quantity_kg: -compKg,
          balance_after_kg: updatedStock?.current_stock_kg ?? 0,
          reference_id: order.id,
          reference_type: "order",
          notes: `Order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} × ${item.quantity} (blend ${comp.percentage}%)`,
        });
      }
    } else {
      // Single-origin product: deduct from single roasted stock
      const roastedStockId = itemData.roastedStockId as string | undefined;
      if (roastedStockId && weightGrams && weightGrams > 0) {
        const deductKg = (weightGrams / 1000) * item.quantity;
        await supabase.rpc("deduct_roasted_stock", {
          stock_id: roastedStockId,
          qty_kg: deductKg,
        });
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

  // 7d. Push stock to ecommerce channels (fire-and-forget)
  const affectedStockIds = new Set<string>();
  for (const item of orderItems) {
    const itemData = item as Record<string, unknown>;
    const rsId = itemData.roastedStockId as string | undefined;
    if (rsId) affectedStockIds.add(rsId);
    const itemBlendComps = itemData.blendComponents as { roasted_stock_id: string }[] | undefined;
    if (itemBlendComps) {
      for (const comp of itemBlendComps) affectedStockIds.add(comp.roasted_stock_id);
    }
  }
  for (const stockId of Array.from(affectedStockIds)) {
    pushStockToChannels(roasterId, stockId).catch((err) =>
      console.error("[order-processing] Stock push error:", err)
    );
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
    .from("roasters")
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
        .from("roasters")
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
  if (contactId) {
    fireAutomationTrigger({
      trigger_type: "order_placed",
      roaster_id: roasterId,
      contact_id: contactId,
      context: { order: { subtotal: subtotalPence / 100, id: order.id } },
    }).catch(() => {});

    if (discountCodeId) {
      fireAutomationTrigger({
        trigger_type: "discount_code_redeemed",
        roaster_id: roasterId,
        contact_id: contactId,
        event_data: { discount_code_id: discountCodeId },
      }).catch(() => {});
    }

    updateContactActivity(contactId).catch(() => {});
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

  // ─── Auto-create "paid" invoice for Stripe-paid orders ───
  // Only runs when roaster has auto_create_invoices enabled
  try {
    const { data: roasterSettings } = await supabase
      .from("roasters")
      .select("auto_create_invoices, business_name, email, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions, default_payment_terms, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font")
      .eq("id", roasterId)
      .single();

    if (roasterSettings && roasterSettings.auto_create_invoices !== false) {
      const orderSubtotal = effectiveSubtotalPence / 100;
      const invoiceNumber = await generateInvoiceNumber(supabase, "roaster", roasterId);
      const invoiceAccessToken = generateAccessToken();

      const dueDays = roasterSettings.default_payment_terms ?? 30;
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() + dueDays);
      const paymentDueDate = invoiceDueDate.toISOString().split("T")[0];
      const issuedDate = new Date().toISOString().split("T")[0];

      // Find person ID for the customer
      let personId: string | null = null;
      if (customerEmail) {
        const { data: person } = await supabase
          .from("people")
          .select("id")
          .eq("email", customerEmail.toLowerCase())
          .maybeSingle();
        if (person) personId = person.id;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          owner_type: "roaster",
          roaster_id: roasterId,
          buyer_id: userId,
          customer_id: personId,
          order_ids: [order.id],
          subtotal: orderSubtotal,
          discount_amount: discountAmountPence / 100,
          tax_rate: 0,
          tax_amount: 0,
          total: orderSubtotal,
          amount_paid: orderSubtotal,
          amount_due: 0,
          currency: "GBP",
          payment_method: "stripe",
          payment_status: "paid",
          status: "paid",
          sent_at: new Date().toISOString(),
          issued_date: issuedDate,
          paid_at: new Date().toISOString(),
          notes: `${isWholesaleChannel ? "Wholesale" : "Storefront"} order — paid via Stripe`,
          due_days: dueDays,
          payment_due_date: paymentDueDate,
          invoice_access_token: invoiceAccessToken,
          platform_fee_percent: effectiveSubtotalPence > 0
            ? Math.round((platformFeePence / effectiveSubtotalPence) * 10000) / 100
            : 0,
          platform_fee_amount: platformFeePence / 100,
        })
        .select("id, invoice_number")
        .single();

      if (invoice && !invoiceError) {
        // Create invoice line items
        const invoiceLineItems = normalizedItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.name || "Item",
          quantity: item.quantity,
          unit_price: item.unitAmount / 100,
          total: (item.unitAmount * item.quantity) / 100,
          sort_order: index,
        }));

        await supabase.from("invoice_line_items").insert(invoiceLineItems);

        // Link invoice to order
        await supabase
          .from("orders")
          .update({ invoice_id: invoice.id })
          .eq("id", order.id);

        // Record payment
        await supabase.from("invoice_payments").insert({
          invoice_id: invoice.id,
          amount: orderSubtotal,
          payment_method: "stripe",
          reference: stripePaymentId,
          notes: "Auto-recorded from Stripe checkout",
        });

        // Dispatch invoice.created webhook
        dispatchWebhook(roasterId, "invoice.created", {
          invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            roaster_id: roasterId,
            order_ids: [order.id],
            subtotal: orderSubtotal,
            total: orderSubtotal,
            amount_paid: orderSubtotal,
            amount_due: 0,
            currency: "GBP",
            payment_method: "stripe",
            status: "paid",
            line_items: invoiceLineItems,
          },
        });

        // Sync to Xero/Sage
        const syncLineItems = invoiceLineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        const invoicePayload = {
          invoice_number: invoice.invoice_number,
          subtotal: orderSubtotal,
          tax_rate: 0,
          tax_amount: 0,
          total: orderSubtotal,
          currency: "GBP",
          payment_due_date: paymentDueDate,
          issued_date: issuedDate,
          notes: `${isWholesaleChannel ? "Wholesale" : "Storefront"} order — paid via Stripe`,
          status: "paid",
        };

        const customerPayload = {
          name: customerName,
          email: customerEmail,
          business_name: null as string | null,
        };

        syncToXero(roasterId, async () => {
          await pushInvoiceToXero(roasterId, invoicePayload, syncLineItems, customerPayload);
        });

        syncToSage(roasterId, async () => {
          await pushInvoiceToSage(roasterId, invoicePayload, syncLineItems, customerPayload);
        });

        syncToQuickBooks(roasterId, async () => {
          await pushInvoiceToQuickBooks(roasterId, invoicePayload, syncLineItems, customerPayload);
        });
      } else if (invoiceError) {
        console.error("Auto-create invoice failed:", invoiceError);
      }
    }
  } catch (err) {
    // Non-fatal — order was already created successfully
    console.error("Auto-create invoice error (non-fatal):", err);
  }

  return { success: true, orderId: order.id, customerEmail, customerName };
}
