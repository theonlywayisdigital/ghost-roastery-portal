import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { roasterId, code, customerEmail, subtotalPence, items } = await request.json();

    if (!roasterId || !code) {
      return NextResponse.json({ valid: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find the discount code
    const { data: discountCode } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("roaster_id", roasterId)
      .eq("code", code.toUpperCase().trim())
      .single();

    if (!discountCode) {
      return NextResponse.json({ valid: false, error: "Invalid discount code." });
    }

    // Status check
    if (discountCode.status !== "active") {
      return NextResponse.json({ valid: false, error: "This discount code is not currently active." });
    }

    // Started check
    if (discountCode.starts_at && new Date(discountCode.starts_at) > new Date()) {
      return NextResponse.json({ valid: false, error: "This discount code is not yet active." });
    }

    // Expired check
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This discount code has expired." });
    }

    // Usage limit check
    if (discountCode.usage_limit && discountCode.used_count >= discountCode.usage_limit) {
      return NextResponse.json({ valid: false, error: "This discount code has reached its usage limit." });
    }

    // Per-customer limit check
    if (customerEmail && discountCode.usage_per_customer) {
      const { count } = await supabase
        .from("discount_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", discountCode.id)
        .eq("customer_email", customerEmail.toLowerCase());

      if (count !== null && count >= discountCode.usage_per_customer) {
        return NextResponse.json({ valid: false, error: "You have already used this discount code." });
      }
    }

    // First order only check
    if (discountCode.first_order_only && customerEmail) {
      const { count } = await supabase
        .from("wholesale_orders")
        .select("*", { count: "exact", head: true })
        .eq("roaster_id", roasterId)
        .eq("customer_email", customerEmail.toLowerCase());

      if (count !== null && count > 0) {
        return NextResponse.json({ valid: false, error: "This discount code is for first orders only." });
      }
    }

    // Minimum order value check (subtotalPence is in pence)
    const subtotalPounds = (subtotalPence || 0) / 100;
    if (discountCode.minimum_order_value && subtotalPounds < Number(discountCode.minimum_order_value)) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of £${Number(discountCode.minimum_order_value).toFixed(2)} required.`,
      });
    }

    // Product applicability check
    if (discountCode.applies_to === "specific_products" && items?.length) {
      const codeProductIds = discountCode.product_ids || [];
      const hasMatchingProduct = items.some(
        (item: { productId: string }) => codeProductIds.includes(item.productId)
      );
      if (!hasMatchingProduct) {
        return NextResponse.json({ valid: false, error: "This discount code does not apply to items in your cart." });
      }
    }

    // Calculate discount
    let discountAmountPence = 0;
    let displayText = "";

    if (discountCode.discount_type === "percentage") {
      discountAmountPence = Math.round((subtotalPence || 0) * Number(discountCode.discount_value) / 100);
      if (discountCode.maximum_discount) {
        const maxPence = Math.round(Number(discountCode.maximum_discount) * 100);
        discountAmountPence = Math.min(discountAmountPence, maxPence);
      }
      displayText = `${discountCode.discount_value}% off`;
    } else if (discountCode.discount_type === "fixed_amount") {
      discountAmountPence = Math.round(Number(discountCode.discount_value) * 100);
      discountAmountPence = Math.min(discountAmountPence, subtotalPence || 0);
      displayText = `£${Number(discountCode.discount_value).toFixed(2)} off`;
    } else {
      // free_shipping
      discountAmountPence = 0;
      displayText = "Free shipping";
    }

    return NextResponse.json({
      valid: true,
      discountCodeId: discountCode.id,
      code: discountCode.code,
      discountType: discountCode.discount_type,
      discountAmountPence,
      displayText,
    });
  } catch (error) {
    console.error("Discount validate error:", error);
    return NextResponse.json({ valid: false, error: "Failed to validate discount code." }, { status: 500 });
  }
}
