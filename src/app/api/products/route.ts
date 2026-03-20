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
    .select("*, product_variants(id, weight_grams, unit, retail_price, wholesale_price, wholesale_price_preferred, wholesale_price_vip, channel, is_active, grind_type_id, grind_type:roaster_grind_types(id, name)), roasted_stock(id, name, current_stock_kg, low_stock_threshold_kg, is_active), green_beans(id, name, current_stock_kg, low_stock_threshold_kg, is_active)")
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

    // For "other" products: insert option types + values FIRST so we get real UUIDs
    const valueTextToId: Record<string, string> = {};
    if (category === "other" && Array.isArray(option_types) && option_types.length > 0) {
      for (const ot of option_types) {
        const { data: insertedType } = await supabase
          .from("product_option_types")
          .insert({
            product_id: product.id,
            roaster_id: roaster.id,
            name: ot.name,
            sort_order: ot.sort_order ?? 0,
          })
          .select()
          .single();

        if (insertedType && Array.isArray(ot.values)) {
          const valueRows = ot.values.map((v: { value: string; sort_order?: number }, vi: number) => ({
            option_type_id: insertedType.id,
            product_id: product.id,
            roaster_id: roaster.id,
            value: v.value,
            sort_order: v.sort_order ?? vi,
          }));
          const { data: insertedValues } = await supabase
            .from("product_option_values")
            .insert(valueRows)
            .select("id, value");

          // Build lookup: value text → real UUID
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

      // Link "other" product variants to option values via junction table
      if (category === "other" && insertedVariants) {
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

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
