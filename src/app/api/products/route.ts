import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";


export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*, product_variants(id, weight_grams, unit, retail_price, wholesale_price, wholesale_price_preferred, wholesale_price_vip, channel, is_active, grind_type_id, grind_type:roaster_grind_types(id, name)), roasted_stock(id, name, current_stock_kg, low_stock_threshold_kg, is_active), green_beans(id, name, current_stock_kg, low_stock_threshold_kg, is_active), product_images(id, url, sort_order, is_primary), blend_components(id, roasted_stock_id, percentage, roasted_stock:roasted_stock(id, name, current_stock_kg, low_stock_threshold_kg, is_active))")
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check product limit
    const limitCheck = await checkLimit(roaster.id as string, "products", 1);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message, upgrade_required: true },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name, description, origin, tasting_notes, price, unit, image_url, status, sort_order,
      is_retail, is_wholesale, retail_price, wholesale_price,
      minimum_wholesale_quantity, sku, weight_grams, roasted_stock_id, green_bean_id,
      is_purchasable, track_stock, retail_stock_count,
      meta_description, brand, gtin, google_product_category,
      vat_rate, rrp, order_multiples, subscription_frequency,
      variants, category, option_types,
      is_blend, blend_components,
      buyer_access, buyer_pricing,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        roaster_id: roaster.id,
        name,
        category: category || "coffee",
        origin: origin || null,
        tasting_notes: tasting_notes || null,
        description: description || null,
        price: price != null ? parseFloat(price) : 0,
        unit: unit || "250g",
        image_url: image_url || null,
        status: status || "published",
        sort_order: sort_order ?? 0,
        is_retail: is_retail ?? false,
        is_wholesale: is_wholesale ?? true,
        retail_price: retail_price != null ? parseFloat(retail_price) : null,
        wholesale_price: wholesale_price != null ? parseFloat(wholesale_price) : null,
        minimum_wholesale_quantity: minimum_wholesale_quantity ?? 1,
        sku: sku || null,
        weight_grams: weight_grams != null ? parseInt(weight_grams) : null,
        is_purchasable: is_purchasable ?? true,
        track_stock: track_stock ?? false,
        retail_stock_count: retail_stock_count != null ? parseInt(retail_stock_count) : null,
        meta_description: meta_description || null,
        brand: brand || null,
        gtin: gtin || null,
        google_product_category: google_product_category || "Food, Beverages & Tobacco > Beverages > Coffee & Tea",
        vat_rate: vat_rate != null ? parseFloat(vat_rate) : 0,
        rrp: rrp != null ? parseFloat(rrp) : null,
        order_multiples: order_multiples != null ? parseInt(order_multiples) : null,
        subscription_frequency: subscription_frequency || null,
        roasted_stock_id: roasted_stock_id || null,
        green_bean_id: green_bean_id || null,
        is_blend: is_blend ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Product creation error:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    // Insert blend components if this is a blend product
    if (is_blend && Array.isArray(blend_components) && blend_components.length > 0) {
      const componentRows = blend_components.map((bc: { roasted_stock_id: string; percentage: number }) => ({
        product_id: product.id,
        roasted_stock_id: bc.roasted_stock_id,
        percentage: bc.percentage,
      }));
      const { error: blendError } = await supabase
        .from("blend_components")
        .insert(componentRows);
      if (blendError) {
        console.error("Blend components insert error:", blendError);
      }
    }

    // Insert option types + values FIRST so we get real UUIDs
    const valueTextToId: Record<string, string> = {};
    if (Array.isArray(option_types) && option_types.length > 0) {
      for (const ot of option_types) {
        const { data: insertedType } = await supabase
          .from("product_option_types")
          .insert({
            product_id: product.id,
            roaster_id: roaster.id,
            name: ot.name,
            sort_order: ot.sort_order ?? 0,
            is_weight: ot.is_weight ?? false,
            channel: ot.channel || "retail",
          })
          .select()
          .single();

        if (insertedType && Array.isArray(ot.values)) {
          const valueRows = ot.values.map((v: { value: string; sort_order?: number; weight_grams?: number | null }, vi: number) => ({
            option_type_id: insertedType.id,
            product_id: product.id,
            roaster_id: roaster.id,
            value: v.value,
            sort_order: v.sort_order ?? vi,
            weight_grams: v.weight_grams ?? null,
          }));
          const { data: insertedValues } = await supabase
            .from("product_option_values")
            .insert(valueRows)
            .select("id, value, weight_grams");

          // Build lookup: value text → real UUID (and store weight_grams for variant population)
          if (insertedValues) {
            for (const iv of insertedValues) {
              valueTextToId[iv.value] = iv.id;
            }
          }
        }
      }
    }

    // Insert variants if provided
    if (Array.isArray(variants) && variants.length > 0) {
      const variantRows = variants.map((v: Record<string, unknown>) => ({
        product_id: product.id,
        roaster_id: roaster.id,
        weight_grams: v.weight_grams != null ? parseInt(String(v.weight_grams)) : null,
        unit: v.unit ? String(v.unit) : null,
        grind_type_id: v.grind_type_id || null,
        sku: v.sku || null,
        retail_price: v.retail_price != null ? parseFloat(String(v.retail_price)) : null,
        wholesale_price: v.wholesale_price != null ? parseFloat(String(v.wholesale_price)) : null,
        rrp: v.rrp != null ? parseFloat(String(v.rrp)) : null,
        retail_stock_count: v.retail_stock_count != null ? parseInt(String(v.retail_stock_count)) : null,
        track_stock: v.track_stock ?? false,
        is_active: v.is_active ?? true,
        sort_order: v.sort_order ?? 0,
        channel: v.channel || "retail",
      }));

      const { data: insertedVariants, error: variantError } = await supabase
        .from("product_variants")
        .insert(variantRows)
        .select("id");

      if (variantError) {
        console.error("Variant creation error:", variantError);
      }

      // Link product variants to option values via junction table
      if (insertedVariants) {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i] as Record<string, unknown>;
          const rawIds = v.option_value_ids as string[] | undefined;
          if (rawIds && rawIds.length > 0 && insertedVariants[i]) {
            // Map text placeholders to real UUIDs via lookup
            const realIds = rawIds
              .map((placeholder: string) => valueTextToId[placeholder] ?? placeholder)
              .filter((id: string) => id.length === 36);
            if (realIds.length > 0) {
              const junctionRows = realIds.map((ovId: string) => ({
                variant_id: insertedVariants[i].id,
                option_value_id: ovId,
              }));
              const { error: junctionError } = await supabase
                .from("product_variant_option_values")
                .insert(junctionRows);
              if (junctionError) {
                console.error("Junction insert failed:", junctionError);
              }
            }
          }
        }
      }
    }

    // Insert buyer access restrictions
    if (Array.isArray(buyer_access) && buyer_access.length > 0) {
      const accessRows = buyer_access.map((ba: { wholesale_access_id: string }) => ({
        product_id: product.id,
        wholesale_access_id: ba.wholesale_access_id,
        roaster_id: roaster.id,
      }));
      const { error: accessError } = await supabase
        .from("product_buyer_access")
        .insert(accessRows);
      if (accessError) {
        console.error("Buyer access insert error:", accessError);
      }
    }

    // Insert buyer pricing overrides
    if (Array.isArray(buyer_pricing) && buyer_pricing.length > 0) {
      // Map variant indices to real IDs — buyer_pricing uses variant_index for new products
      const { data: productVariants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", product.id)
        .eq("roaster_id", roaster.id)
        .order("sort_order", { ascending: true });

      const variantIds = (productVariants || []).map((v: { id: string }) => v.id);

      const pricingRows = buyer_pricing
        .map((bp: { variant_id?: string; variant_index?: number; wholesale_access_id: string; custom_price: number }) => {
          const variantId = bp.variant_id || (bp.variant_index != null ? variantIds[bp.variant_index] : null);
          if (!variantId) return null;
          return {
            product_id: product.id,
            variant_id: variantId,
            wholesale_access_id: bp.wholesale_access_id,
            roaster_id: roaster.id,
            custom_price: bp.custom_price,
          };
        })
        .filter(Boolean);

      if (pricingRows.length > 0) {
        const { error: pricingError } = await supabase
          .from("product_buyer_pricing")
          .insert(pricingRows);
        if (pricingError) {
          console.error("Buyer pricing insert error:", pricingError);
        }
      }
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
