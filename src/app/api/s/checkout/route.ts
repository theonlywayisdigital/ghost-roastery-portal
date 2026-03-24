import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { calculateStripeProcessingFee } from "@/lib/tier-config";

interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
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
      successUrl: customSuccessUrl,
      cancelUrl: customCancelUrl,
    } = body as {
      roasterId: string;
      items: CheckoutItem[];
      customerEmail?: string;
      customerName?: string;
      deliveryAddress?: {
        label?: string;
        line1: string;
        line2?: string;
        city: string;
        county?: string;
        postcode: string;
        country: string;
      };
      orderNotes?: string;
      wholesaleAccessId?: string;
      discountCodeId?: string;
      discountCode?: string;
      discountType?: string;
      discountAmountPence?: number;
      embedded?: boolean;
      successUrl?: string;
      cancelUrl?: string;
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

      const usersRaw = access.users as unknown;
      const userInfo = Array.isArray(usersRaw) ? usersRaw[0] as { full_name: string | null; email: string } | undefined : usersRaw as { full_name: string | null; email: string } | null;
      wholesaleBuyerEmail = userInfo?.email || customerEmail || "";
      wholesaleBuyerName = userInfo?.full_name || customerName || "Wholesale Buyer";
    }

    // Verify roaster exists and has Stripe connected
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("id, stripe_account_id, platform_fee_percent, business_name, sales_tier, wholesale_stripe_enabled")
      .eq("id", roasterId)
      .eq("storefront_enabled", true)
      .single();

    if (!roaster || !roaster.stripe_account_id) {
      return NextResponse.json(
        { error: "This store is not set up for online payments." },
        { status: 400 }
      );
    }

    // Guard: wholesale Stripe checkout must be enabled by the roaster
    if (isWholesale && !roaster.wholesale_stripe_enabled) {
      return NextResponse.json(
        { error: "Online payment is not enabled for wholesale orders. Please use invoice checkout." },
        { status: 400 }
      );
    }

    // Fetch and validate products
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, retail_price, price, is_purchasable, is_active, is_retail, is_wholesale, track_stock, retail_stock_count, unit, wholesale_price, status, roasted_stock_id, green_bean_id, weight_grams"
      )
      .eq("roaster_id", roasterId)
      .in("id", productIds);

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 400 }
      );
    }

    // Fetch variant details if any items reference a variant
    const variantIds = items.filter((i) => i.variantId).map((i) => i.variantId as string);
    let variantMap: Record<string, { retail_price: number | null; product_id: string; is_active: boolean; channel: string | null; unit: string | null; track_stock: boolean; retail_stock_count: number | null; weight_grams: number | null }> = {};
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, retail_price, product_id, is_active, channel, unit, track_stock, retail_stock_count, weight_grams")
        .in("id", variantIds)
        .eq("is_active", true);
      if (variants) {
        for (const v of variants) {
          variantMap[v.id] = {
            retail_price: v.retail_price,
            product_id: v.product_id,
            is_active: v.is_active,
            channel: v.channel,
            unit: v.unit,
            track_stock: v.track_stock ?? false,
            retail_stock_count: v.retail_stock_count,
            weight_grams: v.weight_grams,
          };
        }
      }

      // Validate all requested variants were found (active)
      for (const item of items) {
        if (item.variantId && !variantMap[item.variantId]) {
          return NextResponse.json(
            { error: "One or more selected variants are unavailable." },
            { status: 400 }
          );
        }
      }

      // Validate variants belong to correct products and channels
      for (const item of items) {
        if (!item.variantId) continue;
        const variant = variantMap[item.variantId];
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;

        if (variant.product_id !== item.productId) {
          return NextResponse.json(
            { error: `Variant does not belong to "${product.name}".` },
            { status: 400 }
          );
        }

        if (!isWholesale && variant.channel && !["retail", "both"].includes(variant.channel)) {
          return NextResponse.json(
            { error: `"${product.name}" variant is not available for retail purchase.` },
            { status: 400 }
          );
        }

        if (isWholesale && variant.channel && !["wholesale", "both"].includes(variant.channel)) {
          return NextResponse.json(
            { error: `"${product.name}" variant is not available for wholesale purchase.` },
            { status: 400 }
          );
        }
      }
    }

    // Validate all products are purchasable and in stock
    const lineItems: { name: string; unitAmount: number; quantity: number; productId: string; unit: string; variantId?: string; variantLabel?: string }[] = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.is_active || !product.is_purchasable) {
        return NextResponse.json(
          { error: `"${product?.name || "Unknown"}" is not available for purchase.` },
          { status: 400 }
        );
      }

      if (isWholesale) {
        if (!product.is_wholesale) {
          return NextResponse.json(
            { error: `"${product.name}" is not available for wholesale purchase.` },
            { status: 400 }
          );
        }
      } else {
        if (!product.is_retail) {
          return NextResponse.json(
            { error: `"${product.name}" is not available for retail purchase.` },
            { status: 400 }
          );
        }
      }

      // Product-level stock check
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

      // Variant-level stock check
      if (!isWholesale && item.variantId && variantMap[item.variantId]) {
        const v = variantMap[item.variantId];
        if (v.track_stock && v.retail_stock_count != null && v.retail_stock_count < item.quantity) {
          return NextResponse.json(
            { error: `"${product.name}" (${item.variantLabel || ""}) only has ${v.retail_stock_count} in stock.` },
            { status: 400 }
          );
        }
      }

      // Stock pool check (roasted stock + green bean)
      const itemWeightGrams = (item.variantId && variantMap[item.variantId]?.weight_grams) || product.weight_grams;
      if (itemWeightGrams && itemWeightGrams > 0) {
        const requiredKg = (itemWeightGrams / 1000) * item.quantity;
        const variantLabel = item.variantLabel ? ` ${item.variantLabel}` : "";
        const itemDesc = `${product.name}${variantLabel}`;

        if (product.roasted_stock_id) {
          const { data: roastedPool } = await supabase
            .from("roasted_stock")
            .select("current_stock_kg")
            .eq("id", product.roasted_stock_id)
            .single();
          if (roastedPool && roastedPool.current_stock_kg < requiredKg) {
            const availableUnits = Math.floor(roastedPool.current_stock_kg / (itemWeightGrams / 1000));
            return NextResponse.json(
              { error: availableUnits <= 0
                  ? `"${itemDesc}" is currently out of stock.`
                  : `Insufficient stock for ${itemDesc} — ${availableUnits} available, ${item.quantity} requested.` },
              { status: 400 }
            );
          }
        }

        if (product.green_bean_id) {
          const { data: greenPool } = await supabase
            .from("green_beans")
            .select("current_stock_kg")
            .eq("id", product.green_bean_id)
            .single();
          if (greenPool && greenPool.current_stock_kg < requiredKg) {
            const availableUnits = Math.floor(greenPool.current_stock_kg / (itemWeightGrams / 1000));
            return NextResponse.json(
              { error: availableUnits <= 0
                  ? `"${itemDesc}" is currently out of stock.`
                  : `Insufficient stock for ${itemDesc} — ${availableUnits} available, ${item.quantity} requested.` },
              { status: 400 }
            );
          }
        }
      }

      let unitPrice: number;
      if (isWholesale) {
        unitPrice = (product as Record<string, unknown>).wholesale_price as number ?? product.price;
      } else if (item.variantId && variantMap[item.variantId]?.retail_price != null) {
        unitPrice = variantMap[item.variantId].retail_price as number;
      } else {
        unitPrice = product.retail_price ?? product.price;
      }

      lineItems.push({
        name: product.name,
        unitAmount: Math.round(unitPrice * 100),
        quantity: item.quantity,
        productId: product.id,
        unit: (item.variantId && variantMap[item.variantId]?.unit) || product.unit,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
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

    // Calculate Stripe processing fee on discounted subtotal (1.5% + 20p)
    const effectiveSubtotalPence = subtotalPence - validatedDiscountPence;
    const platformFeePence = calculateStripeProcessingFee(effectiveSubtotalPence);

    // Create Stripe checkout session
    const effectiveEmail = isWholesale ? wholesaleBuyerEmail! : customerEmail!;
    const effectiveName = isWholesale ? wholesaleBuyerName! : customerName!;
    const baseUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const defaultSuccessPath = isWholesale ? `/wholesale/${encodeURIComponent(body.slug || "")}/success` : `/s/${encodeURIComponent(body.slug || "")}/success`;
    const defaultCancelPath = isWholesale ? `/wholesale/${encodeURIComponent(body.slug || "")}` : `/s/${encodeURIComponent(body.slug || "")}`;
    const successPath = customSuccessUrl || defaultSuccessPath;
    const cancelPath = customCancelUrl || defaultCancelPath;

    // Build session options
    const embeddedSuffix = embedded ? "&embedded=true" : "";
    const sessionOptions: Record<string, unknown> = {
      mode: "payment",
      customer_email: effectiveEmail,
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.variantLabel
              ? `${item.name} (${item.variantLabel})`
              : item.name,
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
        items: (() => {
          // Use compact format to stay within Stripe's 500-char metadata limit
          const compact = JSON.stringify(
            lineItems.map((i) => ({
              p: i.productId,
              a: i.unitAmount,
              q: i.quantity,
              ...(i.variantId ? { v: i.variantId } : {}),
              ...(i.variantLabel ? { l: i.variantLabel } : {}),
            }))
          );
          // Fallback: if still too large, strip variant labels
          if (compact.length > 490) {
            return JSON.stringify(
              lineItems.map((i) => ({
                p: i.productId,
                a: i.unitAmount,
                q: i.quantity,
                ...(i.variantId ? { v: i.variantId } : {}),
              }))
            );
          }
          return compact;
        })(),
        subtotal_pence: subtotalPence.toString(),
        platform_fee_pence: platformFeePence.toString(),
        ...(body.orderNotes ? { order_notes: body.orderNotes.slice(0, 490) } : {}),
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", message, error);
    return NextResponse.json(
      { error: `Failed to create checkout session.`, detail: message },
      { status: 500 }
    );
  }
}
