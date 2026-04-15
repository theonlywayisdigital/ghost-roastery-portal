/**
 * Shared logic for processing inbound ecommerce orders from Shopify/WooCommerce.
 * Handles: mapping lookup, GR order creation, stock deduction, invoice, accounting sync.
 */

import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  fireAutomationTrigger,
  updateContactActivity,
} from "@/lib/automation-triggers";
import { findOrCreatePerson, findOrCreateContact, splitName } from "@/lib/people";
import {
  generateInvoiceNumber,
  generateAccessToken,
} from "@/lib/invoice-utils";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushInvoiceToXero } from "@/lib/xero";
import { syncToSage, pushInvoiceToSage } from "@/lib/sage";
import { syncToQuickBooks, pushInvoiceToQuickBooks } from "@/lib/quickbooks";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

/** Parse weight in grams from a unit string like "250g", "1kg", "500g" */
function parseWeightFromUnit(unit: string | null | undefined): number | null {
  if (!unit) return null;
  const kgMatch = unit.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
  const gMatch = unit.match(/(\d+(?:\.\d+)?)\s*g/i);
  if (gMatch) return Math.round(parseFloat(gMatch[1]));
  return null;
}

export interface ExternalLineItem {
  external_product_id: string;
  external_variant_id: string | null;
  name: string;
  quantity: number;
  price: number; // unit price in pounds
  sku: string | null;
}

export interface ExternalOrder {
  external_order_id: string;
  external_source: "shopify" | "woocommerce" | "squarespace" | "wix";
  order_number: string;
  customer_name: string;
  customer_email: string;
  line_items: ExternalLineItem[];
  shipping_address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  } | null;
  payment_method: string;
  total: number;
  currency: string;
}

export interface ProcessResult {
  success: boolean;
  order_id?: string;
  unmapped_items?: string[];
  error?: string;
}

const PAYMENT_TERMS_DAYS: Record<string, number> = {
  prepay: 0,
  net7: 7,
  net14: 14,
  net30: 30,
};

export async function processEcommerceOrder(
  roasterId: string,
  connectionId: string,
  order: ExternalOrder
): Promise<ProcessResult> {
  const supabase = createServerClient();

  // ─── Check for duplicate ─────────────────────────────────────────
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("roaster_id", roasterId)
    .eq("external_order_id", order.external_order_id)
    .eq("external_source", order.external_source)
    .maybeSingle();

  if (existing) {
    return { success: true, order_id: existing.id }; // Already processed
  }

  // ─── Fetch roaster settings ───────────────────────────────────────
  const { data: roaster } = await supabase
    .from("roasters")
    .select(
      "id, platform_fee_percent, business_name, user_id, sales_tier, auto_create_invoices, auto_send_invoices, email, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions, stripe_account_id"
    )
    .eq("id", roasterId)
    .single();

  if (!roaster) {
    return { success: false, error: "Roaster not found" };
  }

  // ─── Fetch channel mappings for this connection ───────────────────
  const { data: mappings } = await supabase
    .from("product_channel_mappings")
    .select(
      "id, product_id, external_product_id, external_variant_ids"
    )
    .eq("connection_id", connectionId);

  const mappingByExternalId = new Map<
    string,
    {
      product_id: string;
      external_variant_ids: Record<string, string>;
    }
  >();

  if (mappings) {
    for (const m of mappings) {
      mappingByExternalId.set(m.external_product_id, {
        product_id: m.product_id,
        external_variant_ids:
          (m.external_variant_ids as Record<string, string>) || {},
      });
    }
  }

  // ─── Build order items from line items ────────────────────────────
  const unmappedItems: string[] = [];
  const mappedProductIds: string[] = [];
  const mappedVariantIds: string[] = [];

  // First pass: collect all mapped product/variant IDs
  for (const item of order.line_items) {
    const mapping = mappingByExternalId.get(item.external_product_id);
    if (mapping) {
      mappedProductIds.push(mapping.product_id);
      // Find ghost variant ID from external variant ID
      if (item.external_variant_id) {
        for (const [ghostId, extId] of Object.entries(
          mapping.external_variant_ids
        )) {
          if (extId === item.external_variant_id) {
            mappedVariantIds.push(ghostId);
            break;
          }
        }
      }
    }
  }

  // Fetch product data for mapped products
  let productMap: Record<
    string,
    {
      id: string;
      name: string;
      unit: string;
      weight_grams: number | null;
      roasted_stock_id: string | null;
    }
  > = {};

  if (mappedProductIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, unit, weight_grams, roasted_stock_id"
      )
      .in("id", mappedProductIds);

    if (products) {
      productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    }
  }

  // Fetch variant data
  let variantMap: Record<
    string,
    {
      id: string;
      unit: string | null;
      weight_grams: number | null;
    }
  > = {};

  if (mappedVariantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, unit, weight_grams")
      .in("id", mappedVariantIds);

    if (variants) {
      variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));
    }
  }

  // Second pass: build order items
  const orderItems: {
    productId: string;
    name: string;
    unitAmount: number; // pence
    quantity: number;
    unit: string;
    variantId: string | null;
    variantLabel: string | null;
    weightGrams?: number;
    roastedStockId?: string;
    unmapped?: boolean;
  }[] = [];

  let subtotalPence = 0;

  for (const item of order.line_items) {
    const mapping = mappingByExternalId.get(item.external_product_id);

    if (!mapping) {
      // Unmapped product — include in order but flag it
      unmappedItems.push(item.name);
      const unitAmountPence = Math.round(item.price * 100);
      orderItems.push({
        productId: "",
        name: item.name,
        unitAmount: unitAmountPence,
        quantity: item.quantity,
        unit: "",
        variantId: null,
        variantLabel: null,
        unmapped: true,
      });
      subtotalPence += unitAmountPence * item.quantity;
      continue;
    }

    const product = productMap[mapping.product_id];

    // Find ghost variant ID
    let ghostVariantId: string | null = null;
    if (item.external_variant_id) {
      for (const [ghostId, extId] of Object.entries(
        mapping.external_variant_ids
      )) {
        if (extId === item.external_variant_id) {
          ghostVariantId = ghostId;
          break;
        }
      }
    }

    const variant = ghostVariantId ? variantMap[ghostVariantId] : null;
    const unit = variant?.unit || product?.unit || "";
    const weightGrams =
      variant?.weight_grams || product?.weight_grams || parseWeightFromUnit(unit);
    const unitAmountPence = Math.round(item.price * 100);

    orderItems.push({
      productId: mapping.product_id,
      name: product?.name || item.name,
      unitAmount: unitAmountPence,
      quantity: item.quantity,
      unit,
      variantId: ghostVariantId,
      variantLabel: null,
      weightGrams: weightGrams ?? undefined,
      roastedStockId: product?.roasted_stock_id ?? undefined,
    });

    subtotalPence += unitAmountPence * item.quantity;
  }

  // ─── Calculate fees (ecommerce orders: no platform fee) ──────────
  const platformFeePence = 0;
  const roasterPayoutPence = subtotalPence;

  // ─── Look up user_id from customer email ──────────────────────────
  let userId: string | null = null;
  if (order.customer_email) {
    const { data: authUser } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "retail_buyer")
      .limit(1);

    // Try to match by email
    const { data: matchedUser } = await supabase.rpc(
      "get_user_id_by_email",
      { email_input: order.customer_email.toLowerCase() }
    );
    if (matchedUser) userId = matchedUser;
    // Ignore errors — userId is optional
  }

  // ─── Determine order status ───────────────────────────────────────
  const orderStatus = "confirmed"; // External orders are already paid

  // ─── Find or create contact record ──────────────────────────────
  const { firstName, lastName } = splitName(order.customer_name);

  const contactId = await findOrCreateContact(
    supabase,
    roasterId,
    order.customer_email,
    firstName,
    lastName,
    order.shipping_address
  );

  // ─── Create order ─────────────────────────────────────────────────
  const sourceLabel =
    order.external_source === "shopify"
      ? "Shopify"
      : order.external_source === "woocommerce"
        ? "WooCommerce"
        : order.external_source === "squarespace"
          ? "Squarespace"
          : "Wix";
  const orderNotes = [
    `${sourceLabel} \u2014 Order #${order.order_number}`,
    unmappedItems.length > 0
      ? `\u26A0 Unmapped items (stock not deducted): ${unmappedItems.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: createdOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      roaster_id: roasterId,
      customer_name: order.customer_name,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_email: order.customer_email,
      contact_id: contactId,
      delivery_address: order.shipping_address,
      items: orderItems,
      subtotal: subtotalPence / 100,
      platform_fee: platformFeePence / 100,
      roaster_payout: roasterPayoutPence / 100,
      payment_method: order.payment_method,
      status: orderStatus,
      user_id: userId,
      order_channel: "storefront",
      notes: orderNotes,
      external_order_id: order.external_order_id,
      external_source: order.external_source,
    })
    .select("id")
    .single();

  if (orderError || !createdOrder) {
    console.error("[ecommerce-order] Failed to create order:", orderError);
    return {
      success: false,
      error: orderError?.message || "Failed to create order",
    };
  }

  // ─── Decrement stock ──────────────────────────────────────────────
  const affectedStockIds = new Set<string>();

  for (const item of orderItems) {
    if (item.unmapped || !item.productId) continue;

    // Only decrement manual retail_stock_count when the product is NOT
    // linked to a roasted stock pool. When roasted stock is linked it is
    // the source of truth and the KG-based deduction below handles it.
    if (!item.roastedStockId) {
      // Product-level stock
      await supabase.rpc("decrement_product_stock", {
        product_id: item.productId,
        qty: item.quantity,
      });

      // Variant-level stock
      if (item.variantId) {
        await supabase.rpc("decrement_variant_stock", {
          variant_id: item.variantId,
          qty: item.quantity,
        });
      }
    }

    // Roasted stock
    const roastedStockId = item.roastedStockId;
    const weightGrams = item.weightGrams;
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
        reference_id: createdOrder.id,
        reference_type: "order",
        notes: `${sourceLabel} order #${order.order_number} \u2014 ${item.name} x ${item.quantity}`,
      });
      affectedStockIds.add(roastedStockId);
    }

  }

  // Green bean stock deduction — follows roasted_stock.green_bean_id
  if (affectedStockIds.size > 0) {
    const { data: rsGreenLinks } = await supabase
      .from("roasted_stock")
      .select("id, green_bean_id")
      .in("id", Array.from(affectedStockIds));
    const rsToGreen: Record<string, string> = {};
    if (rsGreenLinks) {
      for (const rs of rsGreenLinks) {
        if (rs.green_bean_id) rsToGreen[rs.id] = rs.green_bean_id;
      }
    }
    // Aggregate deductions per green bean from order items
    const greenBeanAgg: Record<string, { totalKg: number; notes: string[] }> = {};
    for (const item of orderItems) {
      if (item.unmapped || !item.roastedStockId || !item.weightGrams || item.weightGrams <= 0) continue;
      const greenBeanId = rsToGreen[item.roastedStockId];
      if (!greenBeanId) continue;
      const deductKg = (item.weightGrams / 1000) * item.quantity;
      if (!greenBeanAgg[greenBeanId]) greenBeanAgg[greenBeanId] = { totalKg: 0, notes: [] };
      greenBeanAgg[greenBeanId].totalKg += deductKg;
      greenBeanAgg[greenBeanId].notes.push(`${item.name} x ${item.quantity}`);
    }
    for (const [greenBeanId, agg] of Object.entries(greenBeanAgg)) {
      const { data: bean } = await supabase
        .from("green_beans")
        .select("current_stock_kg")
        .eq("id", greenBeanId)
        .single();
      if (bean) {
        const newStock = Math.max(0, (bean.current_stock_kg || 0) - agg.totalKg);
        await supabase
          .from("green_beans")
          .update({ current_stock_kg: newStock })
          .eq("id", greenBeanId);
        await supabase.from("green_bean_movements").insert({
          roaster_id: roasterId,
          green_bean_id: greenBeanId,
          movement_type: "order_deduction",
          quantity_kg: -agg.totalKg,
          balance_after_kg: newStock,
          reference_id: createdOrder.id,
          reference_type: "order",
          notes: `${sourceLabel} order #${order.order_number} \u2014 ${agg.notes.join(", ")}`,
        });
      }
    }
  }

  // ─── Push stock to all channels ───────────────────────────────────
  for (const stockId of Array.from(affectedStockIds)) {
    pushStockToChannels(roasterId, stockId).catch((err) =>
      console.error("[ecommerce-order] Stock push error:", err)
    );
  }

  // ─── Notify roaster ──────────────────────────────────────────────
  if (roaster.user_id) {
    await createNotification({
      userId: roaster.user_id,
      type: "new_order",
      title: `New ${sourceLabel} order`,
      body: `${sourceLabel} order #${order.order_number} from ${order.customer_name} \u2014 \u00A3${(subtotalPence / 100).toFixed(2)}`,
      link: "/orders",
      metadata: { order_id: createdOrder.id },
    });
  }

  // ─── Fire automation triggers ─────────────────────────────────────
  if (contactId) {
    fireAutomationTrigger({
      trigger_type: "order_placed",
      roaster_id: roasterId,
      contact_id: contactId,
      context: {
        order: { subtotal: subtotalPence / 100, id: createdOrder.id },
      },
    }).catch(() => {});
    updateContactActivity(contactId).catch(() => {});
  }

  // ─── Dispatch order.placed webhook ────────────────────────────────
  dispatchWebhook(roasterId, "order.placed", {
    order: {
      id: createdOrder.id,
      order_number: createdOrder.id.slice(0, 8).toUpperCase(),
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      delivery_address: order.shipping_address,
      items: orderItems,
      subtotal: subtotalPence / 100,
      platform_fee: platformFeePence / 100,
      roaster_payout: roasterPayoutPence / 100,
      order_channel: "storefront",
      payment_method: order.payment_method,
      status: orderStatus,
      notes: orderNotes,
      external_order_id: order.external_order_id,
      external_source: order.external_source,
      created_at: new Date().toISOString(),
    },
  });

  // ─── Invoice + Accounting sync ────────────────────────────────────
  const invoiceSubtotal = subtotalPence / 100;
  const invoiceTotal = invoiceSubtotal;
  const paymentTerms = "prepay"; // ecommerce orders are prepaid
  const dueDays = PAYMENT_TERMS_DAYS[paymentTerms] || 0;
  const paymentDueDate = new Date();
  paymentDueDate.setDate(paymentDueDate.getDate() + dueDays);

  if (roaster.auto_create_invoices !== false) {
    try {
      const invoiceNumber = await generateInvoiceNumber(
        supabase,
        "roaster",
        roasterId
      );
      const accessToken = generateAccessToken();
      const autoSend = roaster.auto_send_invoices !== false;
      const now = new Date().toISOString();

      // Find or create person
      const personId = await findOrCreatePerson(supabase, order.customer_email, firstName, lastName);

      const { data: invoice } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          owner_type: "roaster",
          roaster_id: roasterId,
          buyer_id: userId || null,
          customer_id: personId || null,
          order_ids: [createdOrder.id],
          subtotal: invoiceSubtotal,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          total: invoiceTotal,
          amount_paid: invoiceTotal, // Already paid
          amount_due: 0,
          currency: "GBP",
          payment_method: order.payment_method,
          payment_status: "paid",
          status: "paid",
          sent_at: now,
          issued_date: now.split("T")[0],
          notes: `${sourceLabel} order #${order.order_number}`,
          due_days: dueDays,
          payment_due_date: paymentDueDate.toISOString().split("T")[0],
          invoice_access_token: accessToken,
          platform_fee_percent: 0,
          platform_fee_amount: 0,
        })
        .select("id, invoice_number")
        .single();

      if (invoice) {
        // Create invoice line items
        const lineItems = orderItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitAmount / 100,
          total: (item.unitAmount * item.quantity) / 100,
          sort_order: index,
        }));

        await supabase.from("invoice_line_items").insert(lineItems);

        // Link invoice to order
        await supabase
          .from("orders")
          .update({ invoice_id: invoice.id })
          .eq("id", createdOrder.id);

        // Dispatch invoice webhook
        dispatchWebhook(roasterId, "invoice.created", {
          invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            roaster_id: roasterId,
            order_ids: [createdOrder.id],
            subtotal: invoiceSubtotal,
            tax_rate: 0,
            tax_amount: 0,
            total: invoiceTotal,
            amount_paid: invoiceTotal,
            amount_due: 0,
            currency: "GBP",
            payment_method: order.payment_method,
            status: "paid",
            line_items: lineItems,
          },
        });

        // ─── Accounting sync ──────────────────────────────────────
        const syncLineItems = lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          total: li.total,
        }));

        const invoicePayload = {
          invoice_number:
            invoice.invoice_number ||
            `ORD-${createdOrder.id.slice(0, 8).toUpperCase()}`,
          subtotal: invoiceSubtotal,
          tax_rate: 0,
          tax_amount: 0,
          total: invoiceTotal,
          currency: "GBP",
          payment_due_date: paymentDueDate.toISOString().split("T")[0],
          issued_date: now.split("T")[0],
          notes: `${sourceLabel} order #${order.order_number}`,
          status: "paid",
        };

        const customerPayload = {
          name: order.customer_name,
          email: order.customer_email,
        };

        syncToXero(roasterId, async () => {
          await pushInvoiceToXero(
            roasterId,
            invoicePayload,
            syncLineItems,
            customerPayload
          );
        });

        syncToSage(roasterId, async () => {
          await pushInvoiceToSage(
            roasterId,
            invoicePayload,
            syncLineItems,
            customerPayload
          );
        });

        syncToQuickBooks(roasterId, async () => {
          await pushInvoiceToQuickBooks(
            roasterId,
            invoicePayload,
            syncLineItems,
            customerPayload
          );
        });
      }
    } catch (invoiceErr) {
      console.error(
        "[ecommerce-order] Invoice creation error:",
        invoiceErr
      );
      // Non-fatal — order is still created
    }
  }

  // ─── Platform fee ledger (0 fee for ecommerce orders) ────────────
  supabase
    .from("platform_fee_ledger")
    .insert({
      roaster_id: roasterId,
      order_type: "storefront",
      reference_id: createdOrder.id,
      gross_amount: subtotalPence / 100,
      fee_percent: 0,
      fee_amount: 0,
      net_to_roaster: roasterPayoutPence / 100,
      currency: "GBP",
      status: "collected",
    })
    .then(({ error: ledgerError }) => {
      if (ledgerError)
        console.error(
          "[ecommerce-order] Ledger entry error:",
          ledgerError
        );
    });

  return {
    success: true,
    order_id: createdOrder.id,
    unmapped_items: unmappedItems.length > 0 ? unmappedItems : undefined,
  };
}
