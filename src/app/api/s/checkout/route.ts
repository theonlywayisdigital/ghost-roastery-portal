import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { type TierLevel, getEffectivePlatformFee } from "@/lib/tier-config";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

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
      discountType,
      // discountAmountPence sent by client but re-validated server-side
      embedded,
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
      wholesaleAccessId?: string;
      discountCodeId?: string;
      discountCode?: string;
      discountType?: string;
      discountAmountPence?: number;
      embedded?: boolean;
    };

    const isWholesale = !!wholesaleAccessId;

    if (!roasterId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!isWholesale && (!customerEmail || !customerName)) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Wholesale: verify access is approved and get buyer info + tier
    let wholesaleTier: string | null = null;
    let wholesaleBuyerEmail: string | null = null;
    let wholesaleBuyerName: string | null = null;
    if (isWholesale) {
      const { data: access } = await supabase
        .from("wholesale_access")
        .select(
          `id, status, price_tier, user_id,
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

      wholesaleTier = access.price_tier;
      const usersRaw = access.users as unknown;
      const userInfo = Array.isArray(usersRaw) ? usersRaw[0] as { full_name: string | null; email: string } | undefined : usersRaw as { full_name: string | null; email: string } | null;
      wholesaleBuyerEmail = userInfo?.email || customerEmail || "";
      wholesaleBuyerName = userInfo?.full_name || customerName || "Wholesale Buyer";
    }

    // Verify roaster exists and has Stripe connected
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id, stripe_account_id, platform_fee_percent, business_name, sales_tier")
      .eq("id", roasterId)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster || !roaster.stripe_account_id) {
      return NextResponse.json(
        { error: "This store is not set up for online payments." },
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

    // Validate all products are purchasable and in stock
    const lineItems: { name: string; unitAmount: number; quantity: number; productId: string; unit: string }[] = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.is_active || !product.is_purchasable) {
        return NextResponse.json(
          { error: `"${product?.name || "Unknown"}" is not available for purchase.` },
          { status: 400 }
        );
      }

      if (isWholesale) {
        if (product.product_type !== "wholesale" && product.product_type !== "both") {
          return NextResponse.json(
            { error: `"${product.name}" is not available for wholesale purchase.` },
            { status: 400 }
          );
        }
      } else {
        if (product.product_type !== "retail" && product.product_type !== "both") {
          return NextResponse.json(
            { error: `"${product.name}" is not available for retail purchase.` },
            { status: 400 }
          );
        }
      }

      if (
        !isWholesale &&
        product.track_stock &&
        product.retail_stock_count != null &&
        product.retail_stock_count < item.quantity
      ) {
        return NextResponse.json(
          { error: `"${product.name}" only has ${product.retail_stock_count} in stock.` },
          { status: 400 }
        );
      }

      let unitPrice: number;
      if (isWholesale && wholesaleTier) {
        const tierPriceMap: Record<string, number | null> = {
          standard: (product as Record<string, unknown>).wholesale_price_standard as number | null,
          preferred: (product as Record<string, unknown>).wholesale_price_preferred as number | null,
          vip: (product as Record<string, unknown>).wholesale_price_vip as number | null,
        };
        unitPrice = tierPriceMap[wholesaleTier] ?? product.price;
      } else {
        unitPrice = product.retail_price ?? product.price;
      }

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
    let validatedDiscountType = discountType;

    if (discountCodeId && discountCode) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("id", discountCodeId)
        .eq("roaster_id", roasterId)
        .eq("status", "active")
        .single();

      if (dc) {
        // Recalculate discount amount server-side
        if (dc.discount_type === "percentage") {
          validatedDiscountPence = Math.round(subtotalPence * Number(dc.discount_value) / 100);
          if (dc.maximum_discount) {
            validatedDiscountPence = Math.min(validatedDiscountPence, Math.round(Number(dc.maximum_discount) * 100));
          }
        } else if (dc.discount_type === "fixed_amount") {
          validatedDiscountPence = Math.min(Math.round(Number(dc.discount_value) * 100), subtotalPence);
        }
        // free_shipping stays at 0

        validatedDiscountCodeId = dc.id;
        validatedDiscountCode = dc.code;
        validatedDiscountType = dc.discount_type;
      } else {
        // Discount code is no longer valid, proceed without it
        validatedDiscountCodeId = undefined;
        validatedDiscountCode = undefined;
        validatedDiscountType = undefined;
      }
    }

    // Calculate platform fee on discounted subtotal
    const effectiveSubtotalPence = subtotalPence - validatedDiscountPence;
    const platformFeePercent = getEffectivePlatformFee((roaster.sales_tier as TierLevel) || "free");
    const platformFeePence = Math.round(
      effectiveSubtotalPence * (platformFeePercent / 100)
    );

    // Create Stripe checkout session
    const effectiveEmail = isWholesale ? wholesaleBuyerEmail! : customerEmail!;
    const effectiveName = isWholesale ? wholesaleBuyerName! : customerName!;
    const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const successPath = isWholesale ? `/wholesale/${encodeURIComponent(body.slug || "")}/success` : `/s/${encodeURIComponent(body.slug || "")}/success`;
    const cancelPath = isWholesale ? `/wholesale/${encodeURIComponent(body.slug || "")}` : `/s/${encodeURIComponent(body.slug || "")}`;

    // Build session options
    const embeddedSuffix = embedded ? "&embedded=true" : "";
    const sessionOptions: Record<string, unknown> = {
      mode: "payment",
      customer_email: effectiveEmail,
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.name,
          },
          unit_amount: item.unitAmount,
        },
        quantity: item.quantity,
      })),
      payment_intent_data: {
        application_fee_amount: platformFeePence,
        transfer_data: {
          destination: roaster.stripe_account_id as string,
        },
      },
      metadata: {
        roaster_id: roasterId,
        customer_name: effectiveName,
        customer_email: effectiveEmail,
        delivery_address: deliveryAddress ? JSON.stringify(deliveryAddress) : "",
        items: JSON.stringify(
          lineItems.map((i) => ({
            productId: i.productId,
            name: i.name,
            unitAmount: i.unitAmount,
            quantity: i.quantity,
            unit: i.unit,
          }))
        ),
        subtotal_pence: subtotalPence.toString(),
        platform_fee_pence: platformFeePence.toString(),
        ...(isWholesale ? { wholesale: "true", wholesale_access_id: wholesaleAccessId } : {}),
        ...(validatedDiscountCodeId
          ? {
              discount_code_id: validatedDiscountCodeId,
              discount_code: validatedDiscountCode || "",
              discount_amount_pence: validatedDiscountPence.toString(),
              discount_type: validatedDiscountType || "",
            }
          : {}),
      },
    };

    // Embedded mode uses Stripe Embedded Checkout (inline, no redirect)
    if (embedded) {
      (sessionOptions as Record<string, unknown>).ui_mode = "embedded";
      (sessionOptions as Record<string, unknown>).return_url = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}${embeddedSuffix}`;
    } else {
      (sessionOptions as Record<string, unknown>).success_url = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
      (sessionOptions as Record<string, unknown>).cancel_url = `${baseUrl}${cancelPath}`;
    }

    // Create ephemeral Stripe coupon if there's a discount
    // Always use amount_off (not percent_off) to enforce our server-side
    // calculation including maximum_discount caps
    if (validatedDiscountPence > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: validatedDiscountPence,
        currency: "gbp",
        duration: "once",
        max_redemptions: 1,
      });
      (sessionOptions as Record<string, unknown>).discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(
      sessionOptions as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    if (embedded) {
      return NextResponse.json({ clientSecret: session.client_secret });
    }
    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
