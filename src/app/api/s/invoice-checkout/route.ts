import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  fireAutomationTrigger,
  updateContactActivity,
} from "@/lib/automation-triggers";
import { findOrCreatePerson } from "@/lib/people";
import {
  generateInvoiceNumber,
  generateAccessToken,
} from "@/lib/invoice-utils";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

const PAYMENT_TERMS_DAYS: Record<string, number> = {
  net7: 7,
  net14: 14,
  net30: 30,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roasterId,
      items,
      customerEmail,
      customerName,
      deliveryAddress,
      wholesaleAccessId,
      discountCodeId,
      discountCode,
      // discountType and discountAmountPence sent by client but re-validated server-side
    } = body as {
      roasterId: string;
      items: CheckoutItem[];
      customerEmail?: string;
      customerName?: string;
      deliveryAddress?: {
        line1: string;
        line2?: string;
        city: string;
        postcode: string;
        country: string;
      };
      wholesaleAccessId: string;
      discountCodeId?: string;
      discountCode?: string;
      discountType?: string;
      discountAmountPence?: number;
    };

    // Invoice checkout is wholesale-only
    if (!wholesaleAccessId) {
      return NextResponse.json(
        { error: "Invoice checkout requires wholesale access." },
        { status: 400 }
      );
    }

    if (!roasterId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify wholesale access is approved and get buyer info + tier + payment_terms
    const { data: access } = await supabase
      .from("wholesale_access")
      .select(
        `id, status, price_tier, payment_terms, user_id,
         users!wholesale_access_user_id_fkey(full_name, email)`
      )
      .eq("id", wholesaleAccessId)
      .eq("roaster_id", roasterId)
      .eq("status", "approved")
      .single();

    if (!access) {
      return NextResponse.json(
        { error: "Wholesale access not found or not approved." },
        { status: 403 }
      );
    }

    const paymentTerms = access.payment_terms as string;
    const wholesaleTier = access.price_tier as string;

    // If payment_terms is 'prepay', they should use regular Stripe checkout
    if (paymentTerms === "prepay") {
      return NextResponse.json(
        { error: "Prepay accounts must use standard checkout." },
        { status: 400 }
      );
    }

    // Validate payment terms
    const dueDays = PAYMENT_TERMS_DAYS[paymentTerms];
    if (!dueDays) {
      return NextResponse.json(
        { error: "Invalid payment terms." },
        { status: 400 }
      );
    }

    const usersRaw = access.users as unknown;
    const userInfo = Array.isArray(usersRaw)
      ? (usersRaw[0] as { full_name: string | null; email: string } | undefined)
      : (usersRaw as { full_name: string | null; email: string } | null);
    const wholesaleBuyerEmail =
      userInfo?.email || customerEmail || "";
    const wholesaleBuyerName =
      userInfo?.full_name || customerName || "Wholesale Buyer";

    if (!wholesaleBuyerEmail) {
      return NextResponse.json(
        { error: "Could not determine buyer email." },
        { status: 400 }
      );
    }

    // Verify roaster exists (does NOT require stripe_account_id since no Stripe payment)
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id, platform_fee_percent, business_name, user_id")
      .eq("id", roasterId)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Roaster not found or storefront not enabled." },
        { status: 400 }
      );
    }

    // Fetch and validate products
    const productIds = items.map((i) => i.productId);
    const { data: products } = await supabase
      .from("wholesale_products")
      .select(
        "id, name, retail_price, price, is_purchasable, is_active, product_type, track_stock, retail_stock_count, unit, wholesale_price_standard, wholesale_price_preferred, wholesale_price_vip"
      )
      .eq("roaster_id", roasterId)
      .in("id", productIds);

    if (!products || products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 400 }
      );
    }

    // Validate all products are purchasable and calculate line items
    const lineItems: {
      name: string;
      unitAmount: number;
      quantity: number;
      productId: string;
      unit: string;
    }[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.is_active || !product.is_purchasable) {
        return NextResponse.json(
          {
            error: `"${product?.name || "Unknown"}" is not available for purchase.`,
          },
          { status: 400 }
        );
      }

      if (
        product.product_type !== "wholesale" &&
        product.product_type !== "both"
      ) {
        return NextResponse.json(
          {
            error: `"${product.name}" is not available for wholesale purchase.`,
          },
          { status: 400 }
        );
      }

      // Get tier-specific price
      const tierPriceMap: Record<string, number | null> = {
        standard: (product as Record<string, unknown>)
          .wholesale_price_standard as number | null,
        preferred: (product as Record<string, unknown>)
          .wholesale_price_preferred as number | null,
        vip: (product as Record<string, unknown>).wholesale_price_vip as
          | number
          | null,
      };
      const unitPrice = tierPriceMap[wholesaleTier] ?? product.price;

      lineItems.push({
        name: product.name,
        unitAmount: Math.round(unitPrice * 100),
        quantity: item.quantity,
        productId: product.id,
        unit: product.unit,
      });
    }

    // Calculate totals
    const subtotalPence = lineItems.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0
    );

    // Re-validate discount server-side if provided
    let validatedDiscountPence = 0;
    let validatedDiscountCodeId = discountCodeId;
    let validatedDiscountCode = discountCode;
    if (discountCodeId && discountCode) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("id", discountCodeId)
        .eq("roaster_id", roasterId)
        .eq("status", "active")
        .single();

      if (dc) {
        if (dc.discount_type === "percentage") {
          validatedDiscountPence = Math.round(
            (subtotalPence * Number(dc.discount_value)) / 100
          );
          if (dc.maximum_discount) {
            validatedDiscountPence = Math.min(
              validatedDiscountPence,
              Math.round(Number(dc.maximum_discount) * 100)
            );
          }
        } else if (dc.discount_type === "fixed_amount") {
          validatedDiscountPence = Math.min(
            Math.round(Number(dc.discount_value) * 100),
            subtotalPence
          );
        }
        // free_shipping stays at 0

        validatedDiscountCodeId = dc.id;
        validatedDiscountCode = dc.code;
      } else {
        // Discount code is no longer valid, proceed without it
        validatedDiscountCodeId = undefined;
        validatedDiscountCode = undefined;
      }
    }

    // Calculate platform fee on discounted subtotal
    const effectiveSubtotalPence = subtotalPence - validatedDiscountPence;
    const platformFeePercent =
      (roaster.platform_fee_percent as number) || 4;
    const platformFeePence = Math.round(
      effectiveSubtotalPence * (platformFeePercent / 100)
    );
    const roasterPayoutPence = effectiveSubtotalPence - platformFeePence;

    // ─── Find or create user account ───
    let userId: string | null = null;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", wholesaleBuyerEmail.toLowerCase())
      .single();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: wholesaleBuyerEmail,
          email_confirm: true,
          user_metadata: {
            full_name: wholesaleBuyerName,
          },
        });

      if (authError) {
        console.error("Failed to create user:", authError);
      } else if (authData.user) {
        userId = authData.user.id;

        await supabase.from("users").insert({
          id: userId,
          email: wholesaleBuyerEmail.toLowerCase(),
          full_name: wholesaleBuyerName,
        });
      }
    }

    // ─── Ensure people record exists ───
    const nameParts = (wholesaleBuyerName || "").split(" ");
    const personId = await findOrCreatePerson(
      supabase,
      wholesaleBuyerEmail,
      nameParts[0] || "",
      nameParts.slice(1).join(" ") || ""
    );

    // ─── Grant retail_buyer role if needed ───
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

    // ─── Create the wholesale order (payment_method: invoice, status: confirmed) ───
    const orderItems = lineItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      unitAmount: i.unitAmount,
      quantity: i.quantity,
      unit: i.unit,
    }));

    const { data: order, error: orderError } = await supabase
      .from("wholesale_orders")
      .insert({
        roaster_id: roasterId,
        customer_name: wholesaleBuyerName,
        customer_email: wholesaleBuyerEmail,
        delivery_address: deliveryAddress || null,
        items: orderItems,
        subtotal: subtotalPence / 100,
        platform_fee: platformFeePence / 100,
        roaster_payout: roasterPayoutPence / 100,
        payment_method: "invoice_online",
        payment_terms: paymentTerms,
        status: "confirmed",
        user_id: userId,
        discount_code_id: validatedDiscountCodeId || null,
        discount_amount: validatedDiscountPence / 100,
        discount_code: validatedDiscountCode || null,
        wholesale_access_id: wholesaleAccessId,
        order_channel: "wholesale",
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

    // ─── Create discount redemption if applicable ───
    if (
      validatedDiscountCodeId &&
      validatedDiscountPence >= 0 &&
      validatedDiscountCode
    ) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", wholesaleBuyerEmail.toLowerCase())
        .eq("roaster_id", roasterId)
        .maybeSingle();

      await supabase.from("discount_redemptions").insert({
        discount_code_id: validatedDiscountCodeId,
        order_id: order.id,
        contact_id: contact?.id || null,
        customer_email: wholesaleBuyerEmail.toLowerCase(),
        order_value: subtotalPence / 100,
        discount_amount: validatedDiscountPence / 100,
      });

      // Increment used_count
      const { data: codeData } = await supabase
        .from("discount_codes")
        .select("used_count")
        .eq("id", validatedDiscountCodeId)
        .single();

      if (codeData) {
        await supabase
          .from("discount_codes")
          .update({ used_count: (codeData.used_count || 0) + 1 })
          .eq("id", validatedDiscountCodeId);
      }
    }

    // ─── Decrement stock for tracked products ───
    for (const item of orderItems) {
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

    // ─── Notify the roaster about the new order ───
    if (roaster.user_id) {
      const discountNote = validatedDiscountCode
        ? ` (discount: ${validatedDiscountCode})`
        : "";
      await createNotification({
        userId: roaster.user_id,
        type: "new_order",
        title: "New wholesale order (invoice)",
        body: `${wholesaleBuyerName || wholesaleBuyerEmail} placed a wholesale order for \u00A3${(effectiveSubtotalPence / 100).toFixed(2)}${discountNote}. Payment terms: ${paymentTerms}.`,
        link: "/orders",
        metadata: { order_id: order.id },
      });
    }

    // ─── Fire automation triggers ───
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("roaster_id", roasterId)
      .eq("email", wholesaleBuyerEmail.toLowerCase())
      .maybeSingle();

    if (contact) {
      fireAutomationTrigger({
        trigger_type: "order_placed",
        roaster_id: roasterId,
        contact_id: contact.id,
        context: {
          order: { subtotal: subtotalPence / 100, id: order.id },
        },
      }).catch(() => {});

      if (validatedDiscountCodeId) {
        fireAutomationTrigger({
          trigger_type: "discount_code_redeemed",
          roaster_id: roasterId,
          contact_id: contact.id,
          event_data: { discount_code_id: validatedDiscountCodeId },
        }).catch(() => {});
      }

      updateContactActivity(contact.id).catch(() => {});
    }

    // ─── Create invoice ───
    const invoiceNumber = await generateInvoiceNumber(
      supabase,
      "roaster",
      roasterId
    );
    const accessToken = generateAccessToken();

    // Calculate invoice totals
    const invoiceSubtotal = effectiveSubtotalPence / 100;
    const invoiceTotal = invoiceSubtotal;

    // Calculate due date based on payment terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const paymentDueDate = dueDate.toISOString().split("T")[0];

    // Look up customer (person) by email for buyer_id / customer_id
    let customerId: string | null = personId;
    if (!customerId) {
      const { data: person } = await supabase
        .from("people")
        .select("id")
        .eq("email", wholesaleBuyerEmail.toLowerCase())
        .maybeSingle();
      customerId = person?.id || null;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        owner_type: "roaster",
        roaster_id: roasterId,
        buyer_id: customerId,
        customer_id: customerId,
        order_ids: [order.id],
        subtotal: invoiceSubtotal,
        discount_amount: validatedDiscountPence / 100,
        tax_rate: 0,
        tax_amount: 0,
        total: invoiceTotal,
        amount_paid: 0,
        amount_due: invoiceTotal,
        currency: "GBP",
        payment_method: "bank_transfer",
        payment_status: "unpaid",
        status: "sent",
        notes: `Wholesale order - ${paymentTerms} payment terms`,
        due_days: dueDays,
        payment_due_date: paymentDueDate,
        invoice_access_token: accessToken,
        platform_fee_percent: platformFeePercent,
        platform_fee_amount: platformFeePence / 100,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError) {
      console.error("Failed to create invoice:", invoiceError);
      // Order was already created, so we return partial success
      return NextResponse.json({
        success: true,
        orderId: order.id,
        invoiceId: null,
        invoiceNumber: null,
        warning: "Order created but invoice generation failed.",
      });
    }

    // ─── Create invoice line items ───
    const invoiceLineItems = lineItems.map((item, index) => ({
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
      console.error("Failed to create invoice line items:", lineItemsError);
    }

    // ─── Record platform fee ledger entry ───
    if (platformFeePence > 0) {
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
          status: "pending",
        })
        .then(({ error: ledgerError }) => {
          if (ledgerError)
            console.error("Failed to write ledger entry:", ledgerError);
        });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      accessToken,
    });
  } catch (error) {
    console.error("Invoice checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process invoice checkout." },
      { status: 500 }
    );
  }
}
