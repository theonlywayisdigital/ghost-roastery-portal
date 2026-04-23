import { NextResponse } from "next/server";
import { createAuthServerClient, createServerClient } from "@/lib/supabase";
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

interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string | null;
  variantLabel?: string | null;
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
      shippingMethodId,
      shippingCost: clientShippingCost,
      // discountType and discountAmountPence sent by client but re-validated server-side
    } = body as {
      roasterId: string;
      items: CheckoutItem[];
      customerEmail?: string;
      customerName?: string;
      deliveryAddress?: {
        label?: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        county?: string;
        postcode: string;
        country: string;
      };
      orderNotes?: string;
      wholesaleAccessId: string;
      discountCodeId?: string;
      discountCode?: string;
      discountType?: string;
      discountAmountPence?: number;
      shippingMethodId?: string;
      shippingCost?: number;
      requiredByDate?: string;
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
        `id, status, price_tier, payment_terms, user_id, business_id, business_name, vat_number, business_address,
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

    // Verify the authenticated user owns this wholesale_access record
    const authClient = await createAuthServerClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser || authUser.id !== access.user_id) {
      return NextResponse.json(
        { error: "Forbidden — access record does not belong to authenticated user." },
        { status: 403 }
      );
    }

    const paymentTerms = access.payment_terms as string;

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
      .from("roasters")
      .select("id, platform_fee_percent, business_name, user_id, sales_tier, auto_create_invoices, auto_send_invoices, email, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions, stripe_account_id, default_weight_loss_pct")
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
      .from("products")
      .select(
        "id, name, retail_price, price, is_purchasable, is_active, is_retail, is_wholesale, track_stock, retail_stock_count, unit, wholesale_price, roasted_stock_id, green_bean_id, weight_grams, is_blend, minimum_wholesale_quantity"
      )
      .eq("roaster_id", roasterId)
      .in("id", productIds);

    if (!products || products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable." },
        { status: 400 }
      );
    }

    // Fetch blend components for blend products
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

    // Fetch variant-level wholesale prices if any items have a variantId
    const variantIds = items
      .map((i) => i.variantId)
      .filter(Boolean) as string[];

    let variantMap: Record<string, { wholesale_price: number | null; unit: string | null; weight_grams: number | null }> = {};

    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, wholesale_price, unit, weight_grams")
        .in("id", variantIds)
        .eq("is_active", true);

      if (variants) {
        variantMap = Object.fromEntries(
          variants.map((v) => [v.id, v])
        );
      }
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

      if (!product.is_wholesale) {
        return NextResponse.json(
          {
            error: `"${product.name}" is not available for wholesale purchase.`,
          },
          { status: 400 }
        );
      }

      // Stock pool check — combine roasted + green bean stock (matching catalogue logic)
      // Only enforce stock limits when the product has stock tracking enabled
      const itemWeightGrams = (item.variantId && variantMap[item.variantId]?.weight_grams) || product.weight_grams;
      if (product.track_stock && itemWeightGrams && itemWeightGrams > 0) {
        const requiredKg = (itemWeightGrams / 1000) * item.quantity;
        const variantUnit = item.variantId && variantMap[item.variantId]?.unit;
        const itemDesc = variantUnit ? `${product.name} ${variantUnit}` : product.name;
        const defaultLossPct = (roaster.default_weight_loss_pct as number) ?? 14;

        let availableKg = 0;
        let hasStockPool = false;

        if (product.is_blend && blendComponentMap[product.id]) {
          // Blend: check each component has enough for its proportional share
          for (const comp of blendComponentMap[product.id]) {
            const compRequiredKg = requiredKg * (comp.percentage / 100);
            const { data: roastedPool } = await supabase
              .from("roasted_stock")
              .select("current_stock_kg, weight_loss_percentage, green_bean_id")
              .eq("id", comp.roasted_stock_id)
              .single();
            if (roastedPool) {
              let compAvailable = Number(roastedPool.current_stock_kg);
              if (roastedPool.green_bean_id) {
                const { data: greenPool } = await supabase
                  .from("green_beans")
                  .select("current_stock_kg")
                  .eq("id", roastedPool.green_bean_id)
                  .single();
                if (greenPool) {
                  const lossPct = roastedPool.weight_loss_percentage ?? defaultLossPct;
                  compAvailable += Number(greenPool.current_stock_kg) * (1 - Number(lossPct) / 100);
                }
              }
              if (compAvailable < compRequiredKg) {
                return NextResponse.json(
                  { error: `Insufficient stock for "${itemDesc}" — a blend component has insufficient stock.` },
                  { status: 400 }
                );
              }
            }
          }
        } else {
          if (product.roasted_stock_id) {
            hasStockPool = true;
            const { data: roastedPool } = await supabase
              .from("roasted_stock")
              .select("current_stock_kg, weight_loss_percentage")
              .eq("id", product.roasted_stock_id)
              .single();
            if (roastedPool) {
              availableKg += Number(roastedPool.current_stock_kg);
              // Also add green bean stock via roasted_stock's linked green bean
              if (product.green_bean_id) {
                const { data: greenPool } = await supabase
                  .from("green_beans")
                  .select("current_stock_kg")
                  .eq("id", product.green_bean_id)
                  .single();
                if (greenPool) {
                  const lossPct = roastedPool.weight_loss_percentage ?? defaultLossPct;
                  availableKg += Number(greenPool.current_stock_kg) * (1 - Number(lossPct) / 100);
                }
              }
            }
          } else if (product.green_bean_id) {
            // No roasted stock pool but has green beans
            hasStockPool = true;
            const { data: greenPool } = await supabase
              .from("green_beans")
              .select("current_stock_kg")
              .eq("id", product.green_bean_id)
              .single();
            if (greenPool) {
              availableKg += Number(greenPool.current_stock_kg) * (1 - defaultLossPct / 100);
            }
          }

          if (hasStockPool && availableKg < requiredKg) {
            const availableUnits = Math.floor(availableKg / (itemWeightGrams / 1000));
            return NextResponse.json(
              { error: availableUnits <= 0
                  ? `"${itemDesc}" is currently out of stock.`
                  : `Insufficient stock for ${itemDesc} — ${availableUnits} available, ${item.quantity} requested.` },
              { status: 400 }
            );
          }
        }
      }

      // Get wholesale price — variant level takes priority over product level
      const variant = item.variantId ? variantMap[item.variantId] : null;
      const unitPrice = variant?.wholesale_price
        ?? (product as Record<string, unknown>).wholesale_price as number
        ?? product.price;

      lineItems.push({
        name: product.name,
        unitAmount: Math.round(unitPrice * 100),
        quantity: item.quantity,
        productId: product.id,
        unit: variant?.unit || product.unit || "",
      });
    }

    // ─── Server-side minimum order quantity validation ───
    // Groups items by product and checks total weight against minimum_wholesale_quantity (in kg)
    const productQuantityMap: Record<string, { name: string; totalKg: number; minimum: number }> = {};
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const minQty = (product as Record<string, unknown>).minimum_wholesale_quantity as number | null;
      if (!minQty || minQty <= 0) continue;
      const variant = item.variantId ? variantMap[item.variantId] : null;
      const weightGrams = variant?.weight_grams ?? product.weight_grams ?? 0;
      if (weightGrams <= 0) continue;
      const itemKg = (weightGrams / 1000) * item.quantity;
      if (!productQuantityMap[product.id]) {
        productQuantityMap[product.id] = { name: product.name, totalKg: 0, minimum: minQty };
      }
      productQuantityMap[product.id].totalKg += itemKg;
    }
    for (const [, entry] of Object.entries(productQuantityMap)) {
      if (entry.totalKg < entry.minimum) {
        return NextResponse.json(
          { error: `"${entry.name}" requires a minimum order of ${entry.minimum}kg (you selected ${entry.totalKg.toFixed(1)}kg).` },
          { status: 400 }
        );
      }
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

    // Invoice orders: no platform fee — roaster keeps full subtotal
    const effectiveSubtotalPence = subtotalPence - validatedDiscountPence;
    const platformFeePence = 0;

    // ─── Server-side shipping validation ───
    let validatedShippingCost = 0;
    let validatedShippingMethodId: string | null = null;

    if (shippingMethodId) {
      const { data: shippingMethod } = await supabase
        .from("shipping_methods")
        .select("id, name, price, free_threshold, max_weight_kg")
        .eq("id", shippingMethodId)
        .eq("roaster_id", roasterId)
        .eq("is_active", true)
        .single();

      if (shippingMethod) {
        validatedShippingMethodId = shippingMethod.id;
        // Calculate total order weight for threshold/limit checks
        const totalWeightKg = lineItems.reduce((sum, item, idx) => {
          const variant = items[idx].variantId ? variantMap[items[idx].variantId!] : null;
          const product = products!.find((p) => p.id === item.productId);
          const wg = variant?.weight_grams ?? product?.weight_grams ?? 0;
          return sum + (wg / 1000) * item.quantity;
        }, 0);

        // Check weight limit
        if (shippingMethod.max_weight_kg && totalWeightKg > shippingMethod.max_weight_kg) {
          return NextResponse.json(
            { error: "Order exceeds the weight limit for the selected shipping method." },
            { status: 400 }
          );
        }

        // Apply free threshold
        const effectiveSubtotal = effectiveSubtotalPence / 100;
        if (shippingMethod.free_threshold && effectiveSubtotal >= Number(shippingMethod.free_threshold)) {
          validatedShippingCost = 0;
        } else {
          validatedShippingCost = Number(shippingMethod.price);
        }
      }
    }

    const shippingCostPence = Math.round(validatedShippingCost * 100);
    const roasterPayoutPence = effectiveSubtotalPence + shippingCostPence;

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
          email: wholesaleBuyerEmail.toLowerCase(),
          email_confirm: true,
          user_metadata: {
            full_name: wholesaleBuyerName,
          },
        });

      if (authError) {
        console.error("Failed to create user:", authError);
      } else if (authData.user) {
        userId = authData.user.id;

        // Trigger may auto-create public.users — upsert to be safe
        const { firstName: wbFirst, lastName: wbLast } = splitName(wholesaleBuyerName);
        await supabase.from("users").upsert({
          id: userId,
          email: wholesaleBuyerEmail.toLowerCase(),
          first_name: wbFirst,
          last_name: wbLast,
        }, { onConflict: "id" });
      }
    }

    // ─── Ensure people record exists ───
    const { firstName, lastName } = splitName(wholesaleBuyerName);
    const personId = await findOrCreatePerson(
      supabase,
      wholesaleBuyerEmail,
      firstName,
      lastName
    );

    // ─── Find or create contact ───
    const contactId = await findOrCreateContact(
      supabase,
      roasterId,
      wholesaleBuyerEmail,
      firstName,
      lastName,
      deliveryAddress || null
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
    const orderItems = lineItems.map((i, idx) => {
      const product = products!.find((p) => p.id === i.productId);
      const variant = items[idx].variantId ? variantMap[items[idx].variantId!] : null;
      // Variant weight takes priority over product weight
      const weightGrams = variant?.weight_grams ?? product?.weight_grams ?? null;
      const isBlend = product?.is_blend ?? false;
      const roastedStockId = !isBlend ? (product?.roasted_stock_id ?? null) : null;
      const greenBeanId = product?.green_bean_id ?? null;
      const blendComponents = isBlend ? (blendComponentMap[i.productId] || []) : undefined;

      return {
        productId: i.productId,
        name: i.name,
        unitAmount: i.unitAmount,
        quantity: i.quantity,
        unit: i.unit,
        variantId: items[idx].variantId || null,
        variantLabel: items[idx].variantLabel || null,
        ...(weightGrams != null ? { weightGrams } : {}),
        ...(roastedStockId ? { roastedStockId } : {}),
        ...(greenBeanId ? { greenBeanId } : {}),
        ...(blendComponents && blendComponents.length > 0 ? { blendComponents } : {}),
      };
    });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        roaster_id: roasterId,
        customer_name: wholesaleBuyerName,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: wholesaleBuyerEmail,
        contact_id: contactId,
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
        notes: body.orderNotes || null,
        shipping_method_id: validatedShippingMethodId,
        shipping_cost: validatedShippingCost,
        required_by_date: body.requiredByDate || null,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Failed to create order:", orderError);
      return NextResponse.json(
        { error: "Failed to create order.", detail: orderError?.message ?? String(orderError) },
        { status: 500 }
      );
    }

    // ─── Create discount redemption if applicable ───
    if (
      validatedDiscountCodeId &&
      validatedDiscountPence >= 0 &&
      validatedDiscountCode
    ) {
      await supabase.from("discount_redemptions").insert({
        discount_code_id: validatedDiscountCodeId,
        order_id: order.id,
        contact_id: contactId || null,
        customer_email: wholesaleBuyerEmail.toLowerCase(),
        order_value: subtotalPence / 100,
        discount_amount: validatedDiscountPence / 100,
      });

      // Increment used_count atomically
      await supabase.rpc("increment_discount_used_count", { discount_id: validatedDiscountCodeId });
    }

    // ─── Decrement manual stock for tracked products ───
    // Only decrement retail_stock_count when the product is NOT linked to
    // a roasted stock pool. Products with roasted stock use KG-based deduction.
    for (const item of orderItems) {
      const itemData = item as Record<string, unknown>;
      const hasRoastedStock = itemData.roastedStockId ||
        (itemData.blendComponents as unknown[] | undefined)?.length;
      if (!hasRoastedStock) {
        await supabase.rpc("decrement_product_stock", {
          product_id: item.productId,
          qty: item.quantity,
        });
      }
    }

    // ─── Stock deduction — roasted first, shortfall from green beans ───
    const defaultLossPct = (roaster.default_weight_loss_pct as number) ?? 14;

    async function deductFromPool(
      roastedStockId: string,
      requiredKg: number,
      label: string
    ) {
      // Fetch roasted pool with its linked green bean
      const { data: pool } = await supabase
        .from("roasted_stock")
        .select("current_stock_kg, weight_loss_percentage, green_bean_id")
        .eq("id", roastedStockId)
        .single();
      if (!pool) return;

      const roastedAvailable = Number(pool.current_stock_kg);
      const roastedDeduct = Math.min(requiredKg, roastedAvailable);

      // Deduct what we can from roasted stock
      if (roastedDeduct > 0) {
        await supabase.rpc("deduct_roasted_stock", {
          stock_id: roastedStockId,
          qty_kg: roastedDeduct,
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
          quantity_kg: -roastedDeduct,
          balance_after_kg: updatedStock?.current_stock_kg ?? 0,
          reference_id: order.id,
          reference_type: "order",
          notes: label,
        });
      }

      // If shortfall remains, deduct from linked green beans
      const shortfallKg = requiredKg - roastedDeduct;
      if (shortfallKg > 0 && pool.green_bean_id) {
        const lossPct = Number(pool.weight_loss_percentage ?? defaultLossPct);
        const greenDeductKg = shortfallKg / (1 - lossPct / 100);

        const { data: bean } = await supabase
          .from("green_beans")
          .select("current_stock_kg")
          .eq("id", pool.green_bean_id)
          .single();
        if (bean) {
          const newStock = Math.max(0, Number(bean.current_stock_kg || 0) - greenDeductKg);
          await supabase
            .from("green_beans")
            .update({ current_stock_kg: newStock })
            .eq("id", pool.green_bean_id);
          await supabase.from("green_bean_movements").insert({
            roaster_id: roasterId,
            green_bean_id: pool.green_bean_id,
            movement_type: "order_deduction",
            quantity_kg: -greenDeductKg,
            balance_after_kg: newStock,
            reference_id: order.id,
            reference_type: "order",
            notes: `${label} (green bean shortfall)`,
          });
        }
      }
    }

    for (const item of orderItems) {
      const itemData = item as Record<string, unknown>;
      const weightGrams = itemData.weightGrams as number | undefined;
      const itemBlendComps = itemData.blendComponents as { roasted_stock_id: string; percentage: number }[] | undefined;

      if (itemBlendComps && itemBlendComps.length > 0 && weightGrams && weightGrams > 0) {
        const totalKg = (weightGrams / 1000) * item.quantity;
        for (const comp of itemBlendComps) {
          const compKg = totalKg * (comp.percentage / 100);
          await deductFromPool(
            comp.roasted_stock_id,
            compKg,
            `Order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} × ${item.quantity} (blend ${comp.percentage}%)`
          );
        }
      } else {
        const roastedStockId = itemData.roastedStockId as string | undefined;
        if (roastedStockId && weightGrams && weightGrams > 0) {
          const deductKg = (weightGrams / 1000) * item.quantity;
          await deductFromPool(
            roastedStockId,
            deductKg,
            `Order ${order.id.slice(0, 8).toUpperCase()} — ${item.name} × ${item.quantity}`
          );
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
        console.error("[invoice-checkout] Stock push error:", err)
      );
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
    if (contactId) {
      fireAutomationTrigger({
        trigger_type: "order_placed",
        roaster_id: roasterId,
        contact_id: contactId,
        context: {
          order: { subtotal: subtotalPence / 100, id: order.id },
        },
      }).catch(() => {});

      if (validatedDiscountCodeId) {
        fireAutomationTrigger({
          trigger_type: "discount_code_redeemed",
          roaster_id: roasterId,
          contact_id: contactId,
          event_data: { discount_code_id: validatedDiscountCodeId },
        }).catch(() => {});
      }

      updateContactActivity(contactId).catch(() => {});
    }

    // ─── Common totals for invoice / Xero / Sage ───
    const invoiceSubtotal = effectiveSubtotalPence / 100;
    const invoiceShippingAmount = validatedShippingCost;
    const invoiceTotal = invoiceSubtotal + invoiceShippingAmount;

    // Calculate due date based on payment terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const paymentDueDate = dueDate.toISOString().split("T")[0];

    // Resolve business_id from wholesale_access or contact
    const wholesaleBusinessId = (access as Record<string, unknown>).business_id as string | null;
    let invoiceBusinessId = wholesaleBusinessId || null;

    if (!invoiceBusinessId && contactId) {
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("business_id")
        .eq("id", contactId)
        .single();
      if (contactRow?.business_id) {
        invoiceBusinessId = contactRow.business_id;
      }
    }

    // ─── Create invoice (only if auto_create_invoices is enabled) ───
    const autoCreate = roaster.auto_create_invoices !== false;
    const autoSend = autoCreate && roaster.auto_send_invoices !== false;
    const now = new Date().toISOString();

    console.log(`[invoice-checkout] roaster=${roasterId} autoCreate=${autoCreate} autoSend=${autoSend} auto_create_invoices=${roaster.auto_create_invoices} auto_send_invoices=${roaster.auto_send_invoices}`);

    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    let accessToken: string | null = null;
    let invoiceLineItems: { invoice_id: string; description: string; quantity: number; unit_price: number; total: number; sort_order: number }[] = [];

    if (autoCreate) {
      invoiceNumber = await generateInvoiceNumber(
        supabase,
        "roaster",
        roasterId
      );
      accessToken = generateAccessToken();

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          owner_type: "roaster",
          roaster_id: roasterId,
          buyer_id: userId || null,
          customer_id: personId || null,
          business_id: invoiceBusinessId,
          wholesale_access_id: wholesaleAccessId,
          order_ids: [order.id],
          subtotal: invoiceSubtotal,
          discount_amount: validatedDiscountPence / 100,
          shipping_amount: invoiceShippingAmount,
          tax_rate: 0,
          tax_amount: 0,
          total: invoiceTotal,
          amount_paid: 0,
          amount_due: invoiceTotal,
          currency: "GBP",
          payment_method: "bank_transfer",
          payment_status: "unpaid",
          status: autoSend ? "sent" : "draft",
          ...(autoSend ? { sent_at: now, issued_date: now.split("T")[0] } : {}),
          notes: `Wholesale order - ${paymentTerms} payment terms`,
          due_days: dueDays,
          payment_due_date: paymentDueDate,
          invoice_access_token: accessToken,
          platform_fee_percent: 0,
          platform_fee_amount: 0,
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

      invoiceId = invoice.id;
      invoiceNumber = invoice.invoice_number;

      // ─── Create invoice line items ───
      invoiceLineItems = lineItems.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unitAmount / 100,
        total: (item.unitAmount * item.quantity) / 100,
        sort_order: index,
      }));

      // Add shipping as a line item if applicable
      if (invoiceShippingAmount > 0) {
        invoiceLineItems.push({
          invoice_id: invoice.id,
          description: "Shipping",
          quantity: 1,
          unit_price: invoiceShippingAmount,
          total: invoiceShippingAmount,
          sort_order: lineItems.length,
        });
      }

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(invoiceLineItems);

      if (lineItemsError) {
        console.error("Failed to create invoice line items:", lineItemsError);
      }

      // ─── Link invoice to order ───
      await supabase
        .from("orders")
        .update({ invoice_id: invoice.id })
        .eq("id", order.id);

      // ─── Create Stripe payment link (if roaster has Stripe Connect) ───
      let stripePaymentLinkUrl: string | null = null;

      if (autoSend && roaster.stripe_account_id) {
        try {
          const amountPence = Math.round(invoiceTotal * 100);

          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: wholesaleBuyerEmail || undefined,
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

          console.log(`[invoice-checkout] Stripe payment link created | roaster=${roasterId} invoice=${invoiceId} url=${session.url?.substring(0, 60)}...`);
        } catch (stripeErr) {
          console.error(`[invoice-checkout] Stripe session creation failed (non-fatal) | roaster=${roasterId} invoice=${invoiceId}`, stripeErr);
          // Fall back to "View Invoice" — don't block the email
        }
      }

      // ─── Send invoice email with PDF attached (if auto_send) ───
      if (autoSend && wholesaleBuyerEmail) {
        const invoiceLineItemsForEmail = lineItems.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitAmount / 100,
          total: (item.unitAmount * item.quantity) / 100,
        }));

        if (invoiceShippingAmount > 0) {
          invoiceLineItemsForEmail.push({
            description: "Shipping",
            quantity: 1,
            unit_price: invoiceShippingAmount,
            total: invoiceShippingAmount,
          });
        }

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
          customerName: wholesaleBuyerName,
          customerAddress: null,
          invoiceNumber: invoiceNumber!,
          issuedDate: now,
          dueDate: paymentDueDate,
          lineItems: invoiceLineItemsForEmail,
          subtotal: invoiceSubtotal,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: validatedDiscountPence / 100,
          shippingAmount: invoiceShippingAmount,
          total: invoiceTotal,
          amountPaid: 0,
          notes: `Wholesale order - ${paymentTerms} payment terms`,
          status: "sent",
          currency: "GBP",
          branding,
          bankName: roaster.bank_name || null,
          bankAccountNumber: roaster.bank_account_number || null,
          bankSortCode: roaster.bank_sort_code || null,
          paymentInstructions: roaster.payment_instructions || null,
        }).catch((err) => {
          console.error(`[invoice-checkout] PDF generation failed | roaster=${roasterId} invoice=${invoiceId}`, err);
          return null;
        });

        sendInvoiceEmail({
          to: wholesaleBuyerEmail,
          customerName: wholesaleBuyerName,
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
        }).catch((err) => console.error(`[invoice-checkout] Email send failed | roaster=${roasterId} invoice=${invoiceId} to=${wholesaleBuyerEmail}`, err));
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

    // ─── Record platform fee ledger entry (0 fee for invoice orders) ───
    supabase
      .from("platform_fee_ledger")
      .insert({
        roaster_id: roasterId,
        order_type: "wholesale",
        reference_id: order.id,
        gross_amount: effectiveSubtotalPence / 100,
        fee_percent: 0,
        fee_amount: 0,
        net_to_roaster: roasterPayoutPence / 100,
        currency: "GBP",
        status: "collected",
      })
      .then(({ error: ledgerError }) => {
        if (ledgerError)
          console.error("Failed to write ledger entry:", ledgerError);
      });

    // Dispatch order.placed webhook
    dispatchWebhook(roasterId, "order.placed", {
      order: {
        id: order.id,
        order_number: order.id.slice(0, 8).toUpperCase(),
        customer_name: wholesaleBuyerName,
        customer_email: wholesaleBuyerEmail,
        delivery_address: deliveryAddress || null,
        items: orderItems,
        subtotal: subtotalPence / 100,
        platform_fee: platformFeePence / 100,
        roaster_payout: roasterPayoutPence / 100,
        discount_code: validatedDiscountCode || null,
        discount_amount: validatedDiscountPence / 100,
        order_channel: "wholesale",
        payment_method: "invoice_online",
        payment_terms: paymentTerms,
        status: "confirmed",
        notes: body.orderNotes || null,
        created_at: new Date().toISOString(),
      },
    });

    // ─── Xero/Sage sync — always fires (uses invoice data if available, or order data) ───
    const accessBusinessName = (access as Record<string, unknown>).business_name as string | null;
    const accessVatNumber = (access as Record<string, unknown>).vat_number as string | null;

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

    if (invoiceBusinessId) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, email, vat_number, address_line_1, address_line_2, city, postcode, country")
        .eq("id", invoiceBusinessId)
        .single();
      if (biz) bizData = biz;
    }

    // Fall back to wholesale_access data if no business record
    if (!bizData && accessBusinessName) {
      bizData = {
        name: accessBusinessName,
        vat_number: accessVatNumber,
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

    // Build line items payload for Xero/Sage (from invoice items or order items)
    const syncLineItems = autoCreate && invoiceLineItems.length > 0
      ? invoiceLineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      : lineItems.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unitAmount / 100,
        }));

    const invoicePayload = {
      invoice_number: invoiceNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      subtotal: invoiceSubtotal,
      tax_rate: 0,
      tax_amount: 0,
      total: invoiceTotal,
      currency: "GBP",
      payment_due_date: paymentDueDate,
      issued_date: autoSend ? new Date().toISOString().split("T")[0] : null,
      notes: `Wholesale order - ${paymentTerms} payment terms`,
      status: autoSend ? "sent" : "draft",
    };

    const customerPayload = {
      name: wholesaleBuyerName,
      email: wholesaleBuyerEmail,
      business_name: bizData?.name || accessBusinessName || null,
    };

    // Sync invoice to Xero
    syncToXero(roasterId, async () => {
      try {
        await pushInvoiceToXero(
          roasterId,
          invoicePayload,
          syncLineItems,
          customerPayload,
          bizData || undefined
        );
      } catch (err) {
        console.error(`[invoice-checkout] Xero sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`, err);
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
          customerPayload,
          bizData || undefined
        );
      } catch (err) {
        console.error(`[invoice-checkout] Sage sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`, err);
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
        console.error(`[invoice-checkout] QuickBooks sync failed | roaster=${roasterId} invoice=${invoiceId} order=${order.id}`, err);
        throw err;
      }
    });

    console.log(`[invoice-checkout] Complete | roaster=${roasterId} order=${order.id} invoiceId=${invoiceId || "none"} invoiceNumber=${invoiceNumber || "none"} autoCreate=${autoCreate} autoSend=${autoSend}`);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      invoiceId,
      invoiceNumber,
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
