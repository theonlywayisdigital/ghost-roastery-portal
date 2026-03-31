import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
import { stripe } from "@/lib/stripe";
import { pushStockToChannels } from "@/lib/ecommerce-stock-sync";

interface ManualOrderItem {
  productId: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number; // pounds (NOT pence)
}

const PAYMENT_TERMS_DAYS: Record<string, number> = {
  prepay: 0,
  net7: 7,
  net14: 14,
  net30: 30,
};

export async function POST(request: Request) {
  try {
    // ─── Auth ───
    const user = await getCurrentUser();
    if (!user?.roaster?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roasterId = user.roaster.id;
    const supabase = createServerClient();

    // ─── Parse request body ───
    const body = await request.json();
    const {
      orderChannel,
      customerId,
      customerName,
      customerEmail,
      customerBusiness,
      customerPhone,
      items,
      deliveryAddress,
      paymentMethod,
      paymentTerms,
      notes,
      status: requestedStatus,
      inboxMessageId,
      markedAsPaid,
      paidViaOther,
    } = body as {
      orderChannel: "wholesale" | "storefront";
      customerId?: string;
      customerName: string;
      customerEmail: string;
      customerBusiness?: string;
      customerPhone?: string;
      items: ManualOrderItem[];
      deliveryAddress?: {
        label?: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        county?: string;
        postcode: string;
        country: string;
      };
      paymentMethod: string;
      paymentTerms?: string;
      notes?: string;
      status?: string;
      inboxMessageId?: string;
      markedAsPaid?: boolean;
      paidViaOther?: string;
    };

    // ─── Validation ───
    if (!items?.length) {
      return NextResponse.json(
        { error: "At least one item is required." },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required." },
        { status: 400 }
      );
    }

    // ─── Fetch roaster settings ───
    const { data: roaster } = await supabase
      .from("roasters")
      .select(
        "id, platform_fee_percent, business_name, user_id, sales_tier, auto_create_invoices, auto_send_invoices, email, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions, stripe_account_id"
      )
      .eq("id", roasterId)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Roaster not found." },
        { status: 400 }
      );
    }

    // ─── Fetch products ───
    const productIds = items.map((i) => i.productId);
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, retail_price, price, is_active, track_stock, retail_stock_count, unit, wholesale_price, roasted_stock_id, green_bean_id, weight_grams, is_blend"
      )
      .eq("roaster_id", roasterId)
      .in("id", productIds);

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 400 }
      );
    }

    // ─── Fetch blend components for blend products ───
    const blendComponentMap: Record<string, { roasted_stock_id: string; percentage: number }[]> = {};
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

    // ─── Fetch variants (if any items have variantId) ───
    const variantIds = items
      .map((i) => i.variantId)
      .filter(Boolean) as string[];

    let variantMap: Record<
      string,
      {
        wholesale_price: number | null;
        retail_price: number | null;
        price: number | null;
        unit: string | null;
        weight_grams: number | null;
      }
    > = {};

    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, wholesale_price, retail_price, price, unit, weight_grams")
        .in("id", variantIds)
        .eq("is_active", true);

      if (variants) {
        variantMap = Object.fromEntries(
          variants.map((v) => [v.id, v])
        );
      }
    }

    // ─── Build order items ───
    const orderItems: {
      productId: string;
      name: string;
      unitAmount: number;
      quantity: number;
      unit: string;
      variantId: string | null;
      variantLabel: string | null;
      weightGrams?: number;
      roastedStockId?: string;
      greenBeanId?: string;
    }[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      const variant = item.variantId ? variantMap[item.variantId] : null;
      const unitAmountPence = Math.round(item.unitPrice * 100);
      const weightGrams =
        variant?.weight_grams ?? product.weight_grams ?? null;
      const isBlend = product.is_blend ?? false;
      const roastedStockId = !isBlend ? (product.roasted_stock_id ?? null) : null;
      const greenBeanId = product.green_bean_id ?? null;
      const blendComponents = isBlend ? (blendComponentMap[product.id] || []) : undefined;

      orderItems.push({
        productId: product.id,
        name: product.name,
        unitAmount: unitAmountPence,
        quantity: item.quantity,
        unit: variant?.unit || product.unit || "",
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null,
        ...(weightGrams != null ? { weightGrams } : {}),
        ...(roastedStockId ? { roastedStockId } : {}),
        ...(greenBeanId ? { greenBeanId } : {}),
        ...(blendComponents && blendComponents.length > 0 ? { blendComponents } : {}),
      });
    }

    // ─── Calculate totals ───
    const subtotalPence = orderItems.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0
    );

    // Manual orders: no platform fee — roaster keeps full subtotal
    const platformFeePence = 0;
    const roasterPayoutPence = subtotalPence;

    // ─── Find or create person ───
    const { firstName, lastName } = splitName(customerName);
    const personId = await findOrCreatePerson(
      supabase,
      customerEmail,
      firstName,
      lastName,
      customerPhone || null
    );

    // ─── Find or create contact ───
    const contactId = await findOrCreateContact(
      supabase,
      roasterId,
      customerEmail,
      firstName,
      lastName,
      deliveryAddress || null
    );

    // ─── Find existing user ───
    let userId: string | null = null;
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", customerEmail.toLowerCase())
      .single();

    if (existingUser) {
      userId = existingUser.id;
    }

    // ─── Insert order ───
    const orderStatus = markedAsPaid ? "paid" : (requestedStatus || "confirmed");
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        roaster_id: roasterId,
        customer_name: customerName,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: customerEmail,
        contact_id: contactId,
        customer_business: customerBusiness || null,
        delivery_address: deliveryAddress || null,
        items: orderItems,
        subtotal: subtotalPence / 100,
        platform_fee: platformFeePence / 100,
        roaster_payout: roasterPayoutPence / 100,
        payment_method: paymentMethod,
        payment_terms: markedAsPaid ? null : (paymentTerms || null),
        status: orderStatus,
        user_id: userId,
        order_channel: orderChannel,
        notes: [notes, markedAsPaid && paidViaOther ? `Paid via: ${paidViaOther}` : null].filter(Boolean).join("\n") || null,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("[create-manual] Failed to create order:", orderError);
      return NextResponse.json(
        {
          error: "Failed to create order.",
          detail: orderError?.message ?? String(orderError),
        },
        { status: 500 }
      );
    }

    // ─── Decrement stock atomically for tracked products ───
    for (const item of orderItems) {
      await supabase.rpc("decrement_product_stock", {
        product_id: item.productId,
        qty: item.quantity,
      });
    }

    // ─── Roasted stock deduction — deduct KG based on item weight x quantity ───
    for (const item of orderItems) {
      const itemData = item as Record<string, unknown>;
      const weightGrams = itemData.weightGrams as number | undefined;
      const itemBlendComps = itemData.blendComponents as { roasted_stock_id: string; percentage: number }[] | undefined;

      if (itemBlendComps && itemBlendComps.length > 0 && weightGrams && weightGrams > 0) {
        // Blend product: deduct proportionally from each component
        const totalKg = (weightGrams / 1000) * item.quantity;
        for (const comp of itemBlendComps) {
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
            notes: `Manual order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} x ${item.quantity} (blend ${comp.percentage}%)`,
          });
        }
      } else {
        // Single-origin product
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
            notes: `Manual order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} x ${item.quantity}`,
          });
        }
      }
    }

    // ─── Green bean stock deduction — deduct KG based on item weight x quantity ───
    for (const item of orderItems) {
      const greenBeanId = (item as Record<string, unknown>).greenBeanId as
        | string
        | undefined;
      const weightGrams = (item as Record<string, unknown>).weightGrams as
        | number
        | undefined;
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
            notes: `Manual order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} x ${item.quantity}`,
          });
        }
      }
    }

    // ─── Push stock to ecommerce channels (fire-and-forget) ───
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
        console.error("[create-manual] Stock push error:", err)
      );
    }

    // ─── Notify the roaster about the new manual order ───
    if (roaster.user_id) {
      await createNotification({
        userId: roaster.user_id,
        type: "new_order",
        title: "New manual order created",
        body: `Manual ${orderChannel} order for ${customerName} (${customerEmail}) — \u00A3${(subtotalPence / 100).toFixed(2)}. Payment method: ${paymentMethod}.${markedAsPaid ? " Marked as paid." : ""}`,
        link: "/orders",
        metadata: { order_id: order.id },
      });
    }

    // ─── Fire automation triggers ───
    if (contactId) {
      fireAutomationTrigger({
        trigger_type: "order_placed",
        roaster_id: roasterId,
        contact_id: contactId,
        context: {
          order: { subtotal: subtotalPence / 100, id: order.id },
        },
      }).catch(() => {});

      updateContactActivity(contactId).catch(() => {});
    }

    // ─── Common totals for invoice / accounting sync ───
    const invoiceSubtotal = subtotalPence / 100;
    const invoiceTotal = invoiceSubtotal;

    // Calculate due date based on payment terms
    const dueDays =
      paymentTerms && PAYMENT_TERMS_DAYS[paymentTerms] !== undefined
        ? PAYMENT_TERMS_DAYS[paymentTerms]
        : 30; // default to 30 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const paymentDueDate = dueDate.toISOString().split("T")[0];

    // ─── Create invoice (skip entirely if order is marked as paid) ───
    const autoCreate = !markedAsPaid && roaster.auto_create_invoices !== false;
    const autoSend = autoCreate && roaster.auto_send_invoices !== false;
    const now = new Date().toISOString();

    console.log(
      `[create-manual] roaster=${roasterId} autoCreate=${autoCreate} autoSend=${autoSend} auto_create_invoices=${roaster.auto_create_invoices} auto_send_invoices=${roaster.auto_send_invoices}`
    );

    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    let accessToken: string | null = null;
    let invoiceLineItems: {
      invoice_id: string;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
      sort_order: number;
    }[] = [];

    if (autoCreate) {
      invoiceNumber = await generateInvoiceNumber(
        supabase,
        "roaster",
        roasterId
      );
      accessToken = generateAccessToken();

      // Resolve business_id from contact if available
      let invoiceBusinessId: string | null = null;
      if (contactId) {
        const { data: contactRow } = await supabase
          .from("contacts")
          .select("business_id")
          .eq("id", contactId)
          .single();
        if (contactRow?.business_id) {
          invoiceBusinessId = contactRow.business_id;
        }
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          owner_type: "roaster",
          roaster_id: roasterId,
          buyer_id: userId || null,
          customer_id: personId || null,
          business_id: invoiceBusinessId,
          order_ids: [order.id],
          subtotal: invoiceSubtotal,
          discount_amount: 0,
          tax_rate: 0,
          tax_amount: 0,
          total: invoiceTotal,
          amount_paid: 0,
          amount_due: invoiceTotal,
          currency: "GBP",
          payment_method: "bank_transfer",
          payment_status: "unpaid",
          status: autoSend ? "sent" : "draft",
          ...(autoSend
            ? { sent_at: now, issued_date: now.split("T")[0] }
            : {}),
          notes: `Manual ${orderChannel} order${paymentTerms ? ` - ${paymentTerms} payment terms` : ""}`,
          due_days: dueDays,
          payment_due_date: paymentDueDate,
          invoice_access_token: accessToken,
          platform_fee_percent: 0,
          platform_fee_amount: 0,
        })
        .select("id, invoice_number")
        .single();

      if (invoiceError) {
        console.error("[create-manual] Failed to create invoice:", invoiceError);
        // Order was already created, so return partial success
        return NextResponse.json({
          success: true,
          orderId: order.id,
          invoiceId: null,
          invoiceNumber: null,
          warning: "Order created but invoice generation failed.",
        });
      }

      invoiceId = invoice.id;
      invoiceNumber = invoice.invoice_number;

      // ─── Create invoice line items ───
      invoiceLineItems = orderItems.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unitAmount / 100,
        total: (item.unitAmount * item.quantity) / 100,
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(invoiceLineItems);

      if (lineItemsError) {
        console.error(
          "[create-manual] Failed to create invoice line items:",
          lineItemsError
        );
      }

      // ─── Link invoice to order ───
      await supabase
        .from("orders")
        .update({ invoice_id: invoice.id })
        .eq("id", order.id);

      // ─── Create Stripe payment link (if roaster has Stripe Connect and auto_send) ───
      let stripePaymentLinkUrl: string | null = null;

      if (autoSend && roaster.stripe_account_id) {
        try {
          const amountPence = Math.round(invoiceTotal * 100);

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: customerEmail || undefined,
            line_items: [
              {
                price_data: {
                  currency: "GBP",
                  product_data: {
                    name: `Invoice ${invoiceNumber}`,
                    description: `Payment for invoice ${invoiceNumber} from ${roaster.business_name || "Roaster"}`,
                  },
                  unit_amount: amountPence,
                },
                quantity: 1,
              },
            ],
            payment_intent_data: {
              transfer_data: {
                destination: roaster.stripe_account_id,
              },
              metadata: {
                invoice_id: invoiceId!,
                invoice_number: invoiceNumber!,
                roaster_id: roasterId,
              },
            },
            metadata: {
              invoice_id: invoiceId!,
              invoice_number: invoiceNumber!,
              type: "invoice_payment",
            },
            success_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${accessToken}?paid=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${accessToken}`,
          });

          stripePaymentLinkUrl = session.url;

          // Store the Stripe link on the invoice
          await supabase
            .from("invoices")
            .update({
              stripe_payment_link_url: session.url,
              stripe_payment_link_id: session.id,
            })
            .eq("id", invoiceId!);

          console.log(
            `[create-manual] Stripe payment link created | roaster=${roasterId} invoice=${invoiceId} url=${session.url?.substring(0, 60)}...`
          );
        } catch (stripeErr) {
          console.error(
            `[create-manual] Stripe session creation failed (non-fatal) | roaster=${roasterId} invoice=${invoiceId}`,
            stripeErr
          );
          // Fall back to "View Invoice" — don't block the email
        }
      }

      // ─── Send invoice email with PDF attached (if auto_send) ───
      if (autoSend && customerEmail) {
        const invoiceLineItemsForEmail = orderItems.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitAmount / 100,
          total: (item.unitAmount * item.quantity) / 100,
        }));

        const branding = {
          logoUrl: roaster.brand_logo_url || null,
          logoSize: (roaster.storefront_logo_size as "small" | "medium" | "large") || "medium",
          buttonColour: roaster.storefront_button_colour || undefined,
          buttonTextColour: roaster.storefront_button_text_colour || undefined,
          buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
          primaryColour: roaster.brand_primary_colour || undefined,
          accentColour: roaster.brand_accent_colour || undefined,
          headingFont: roaster.brand_heading_font || undefined,
          bodyFont: roaster.brand_body_font || undefined,
          businessName: roaster.business_name || undefined,
        };

        // Generate PDF attachment
        const pdfAttachment = await generateInvoiceAttachment({
          ownerName: roaster.business_name || "Roaster",
          ownerAddress: "",
          ownerEmail: roaster.email || "",
          vatNumber: roaster.vat_number || null,
          customerName: customerName,
          customerAddress: null,
          invoiceNumber: invoiceNumber!,
          issuedDate: now,
          dueDate: paymentDueDate,
          lineItems: invoiceLineItemsForEmail,
          subtotal: invoiceSubtotal,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          total: invoiceTotal,
          amountPaid: 0,
          notes: `Manual ${orderChannel} order${paymentTerms ? ` - ${paymentTerms} payment terms` : ""}`,
          status: "sent",
          currency: "GBP",
          branding,
          bankName: roaster.bank_name || null,
          bankAccountNumber: roaster.bank_account_number || null,
          bankSortCode: roaster.bank_sort_code || null,
          paymentInstructions: roaster.payment_instructions || null,
        }).catch((err) => {
          console.error(
            `[create-manual] PDF generation failed | roaster=${roasterId} invoice=${invoiceId}`,
            err
          );
          return null;
        });

        sendInvoiceEmail({
          to: customerEmail,
          customerName: customerName,
          ownerName: roaster.business_name || "Roaster",
          invoiceNumber: invoiceNumber!,
          total: invoiceTotal,
          currency: "GBP",
          dueDate: paymentDueDate,
          accessToken: accessToken!,
          stripePaymentLinkUrl,
          lineItems: invoiceLineItemsForEmail,
          branding,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        }).catch((err) =>
          console.error(
            `[create-manual] Email send failed | roaster=${roasterId} invoice=${invoiceId} to=${customerEmail}`,
            err
          )
        );
      }

      // Dispatch invoice.created webhook
      dispatchWebhook(roasterId, "invoice.created", {
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          roaster_id: roasterId,
          order_ids: [order.id],
          subtotal: invoiceSubtotal,
          tax_rate: 0,
          tax_amount: 0,
          total: invoiceTotal,
          amount_paid: 0,
          amount_due: invoiceTotal,
          currency: "GBP",
          payment_method: "bank_transfer",
          status: autoSend ? "sent" : "draft",
          due_days: dueDays,
          payment_due_date: paymentDueDate,
          line_items: invoiceLineItems,
        },
      });
    }

    // ─── Record platform fee ledger entry (0 fee for manual orders) ───
    supabase
      .from("platform_fee_ledger")
      .insert({
        roaster_id: roasterId,
        order_type: orderChannel,
        reference_id: order.id,
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
            "[create-manual] Failed to write ledger entry:",
            ledgerError
          );
      });

    // ─── Dispatch order.placed webhook ───
    dispatchWebhook(roasterId, "order.placed", {
      order: {
        id: order.id,
        order_number: order.id.slice(0, 8).toUpperCase(),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_business: customerBusiness || null,
        delivery_address: deliveryAddress || null,
        items: orderItems,
        subtotal: subtotalPence / 100,
        platform_fee: platformFeePence / 100,
        roaster_payout: roasterPayoutPence / 100,
        order_channel: orderChannel,
        payment_method: paymentMethod,
        payment_terms: paymentTerms || null,
        status: orderStatus,
        notes: notes || null,
        created_at: new Date().toISOString(),
      },
    });

    // ─── Xero / Sage / QuickBooks sync ───
    let bizData: {
      name?: string;
      vat_number?: string | null;
      address_line_1?: string | null;
      address_line_2?: string | null;
      city?: string | null;
      postcode?: string | null;
      country?: string | null;
      email?: string | null;
    } | null = null;

    // Try to resolve business from contact
    if (contactId) {
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("business_id")
        .eq("id", contactId)
        .single();

      if (contactRow?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select(
            "name, email, vat_number, address_line_1, address_line_2, city, postcode, country"
          )
          .eq("id", contactRow.business_id)
          .single();
        if (biz) bizData = biz;
      }
    }

    // Fall back to customer business name if no business record
    if (!bizData && customerBusiness) {
      bizData = {
        name: customerBusiness,
        vat_number: null,
      };
    }

    // Try to get a buyer address for the sync
    if (bizData && !bizData.address_line_1 && userId) {
      const { data: addr } = await supabase
        .from("buyer_addresses")
        .select("address_line_1, address_line_2, city, postcode, country")
        .eq("user_id", userId)
        .eq("roaster_id", roasterId)
        .eq("is_default", true)
        .maybeSingle();
      if (addr) {
        bizData.address_line_1 = addr.address_line_1;
        bizData.address_line_2 = addr.address_line_2;
        bizData.city = addr.city;
        bizData.postcode = addr.postcode;
        bizData.country = addr.country;
      }
    }

    // Build line items payload for Xero/Sage/QuickBooks
    const syncLineItems =
      autoCreate && invoiceLineItems.length > 0
        ? invoiceLineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }))
        : orderItems.map((item) => ({
            description: item.name,
            quantity: item.quantity,
            unit_price: item.unitAmount / 100,
          }));

    const invoicePayload = {
      invoice_number:
        invoiceNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      subtotal: invoiceSubtotal,
      tax_rate: 0,
      tax_amount: 0,
      total: invoiceTotal,
      currency: "GBP",
      payment_due_date: paymentDueDate,
      issued_date: autoSend ? new Date().toISOString().split("T")[0] : null,
      notes: `Manual ${orderChannel} order${paymentTerms ? ` - ${paymentTerms} payment terms` : ""}`,
      status: autoSend ? "sent" : "draft",
    };

    const customerPayload = {
      name: customerName,
      email: customerEmail,
      business_name: bizData?.name || customerBusiness || null,
    };

    // Sync invoice to Xero
    syncToXero(roasterId, async () => {
      try {
        await pushInvoiceToXero(
          roasterId,
          invoicePayload,
          syncLineItems,
          customerPayload
        );
      } catch (err) {
        console.error(
          `[create-manual] Xero sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`,
          err
        );
        throw err;
      }
    });

    // Sync invoice to Sage
    syncToSage(roasterId, async () => {
      try {
        await pushInvoiceToSage(
          roasterId,
          invoicePayload,
          syncLineItems,
          customerPayload
        );
      } catch (err) {
        console.error(
          `[create-manual] Sage sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`,
          err
        );
        throw err;
      }
    });

    // Sync invoice to QuickBooks
    syncToQuickBooks(roasterId, async () => {
      try {
        await pushInvoiceToQuickBooks(
          roasterId,
          invoicePayload,
          syncLineItems,
          customerPayload,
          bizData || undefined
        );
      } catch (err) {
        console.error(
          `[create-manual] QuickBooks sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`,
          err
        );
        throw err;
      }
    });

    // ─── Mark inbox message as converted (if order was created from an email) ───
    if (inboxMessageId) {
      await supabase
        .from("inbox_messages")
        .update({ is_converted: true, converted_order_id: order.id })
        .eq("id", inboxMessageId)
        .eq("roaster_id", roasterId);
    }

    console.log(
      `[create-manual] Complete | roaster=${roasterId} order=${order.id} invoiceId=${invoiceId || "none"} invoiceNumber=${invoiceNumber || "none"} autoCreate=${autoCreate} autoSend=${autoSend}${inboxMessageId ? ` inboxMessageId=${inboxMessageId}` : ""}`
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      invoiceId,
      invoiceNumber,
    });
  } catch (error) {
    console.error("[create-manual] Error:", error);
    return NextResponse.json(
      { error: "Failed to create manual order." },
      { status: 500 }
    );
  }
}
