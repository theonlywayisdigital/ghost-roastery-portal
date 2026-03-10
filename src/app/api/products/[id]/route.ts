import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: product, error } = await supabase
    .from("wholesale_products")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Fetch variants with grind type name
  const { data: variants } = await supabase
    .from("product_variants")
    .select("*, grind_type:roaster_grind_types(id, name)")
    .eq("product_id", id)
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return NextResponse.json({ product, variants: variants || [] });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name, description, price, unit, image_url, is_active, sort_order,
      product_type, retail_price, wholesale_price_standard, wholesale_price_preferred,
      wholesale_price_vip, minimum_wholesale_quantity, sku, weight_grams,
      is_purchasable, track_stock, retail_stock_count,
      meta_description, compare_at_price, brand, gtin, google_product_category,
      vat_rate, shipping_cost, rrp, order_multiples, subscription_frequency,
      variants,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: product, error } = await supabase
      .from("wholesale_products")
      .update({
        name,
        description: description || null,
        price: price != null ? parseFloat(price) : 0,
        unit: unit || "250g",
        image_url: image_url || null,
        is_active: is_active ?? true,
        sort_order: sort_order ?? 0,
        product_type: product_type || "retail",
        retail_price: retail_price != null ? parseFloat(retail_price) : null,
        wholesale_price_standard: wholesale_price_standard != null ? parseFloat(wholesale_price_standard) : null,
        wholesale_price_preferred: wholesale_price_preferred != null ? parseFloat(wholesale_price_preferred) : null,
        wholesale_price_vip: wholesale_price_vip != null ? parseFloat(wholesale_price_vip) : null,
        minimum_wholesale_quantity: minimum_wholesale_quantity ?? 1,
        sku: sku || null,
        weight_grams: weight_grams != null ? parseInt(weight_grams) : null,
        is_purchasable: is_purchasable ?? true,
        track_stock: track_stock ?? false,
        retail_stock_count: retail_stock_count != null ? parseInt(retail_stock_count) : null,
        meta_description: meta_description || null,
        compare_at_price: compare_at_price != null ? parseFloat(compare_at_price) : null,
        brand: brand || null,
        gtin: gtin || null,
        google_product_category: google_product_category || "Food, Beverages & Tobacco > Beverages > Coffee & Tea",
        vat_rate: vat_rate != null ? parseFloat(vat_rate) : 0,
        shipping_cost: shipping_cost != null ? parseFloat(shipping_cost) : null,
        rrp: rrp != null ? parseFloat(rrp) : null,
        order_multiples: order_multiples != null ? parseInt(order_multiples) : null,
        subscription_frequency: subscription_frequency || null,
      })
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .select()
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: "Product not found or update failed" },
        { status: 404 }
      );
    }

    // Handle variants diff if provided
    if (Array.isArray(variants)) {
      // Get existing variant IDs
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", id)
        .eq("roaster_id", roaster.id);

      const existingIds = new Set((existingVariants || []).map((v: { id: string }) => v.id));
      const incomingIds = new Set(variants.filter((v: { id?: string }) => v.id).map((v: { id: string }) => v.id));

      // Delete variants not in incoming array
      const toDelete = Array.from(existingIds).filter((eid) => !incomingIds.has(eid));
      if (toDelete.length > 0) {
        await supabase
          .from("product_variants")
          .delete()
          .in("id", toDelete)
          .eq("roaster_id", roaster.id);
      }

      // Upsert variants
      for (const v of variants) {
        const variantData = {
          product_id: id,
          roaster_id: roaster.id,
          weight_grams: v.weight_grams != null ? parseInt(v.weight_grams) : null,
          grind_type_id: v.grind_type_id || null,
          sku: v.sku || null,
          retail_price: v.retail_price != null ? parseFloat(v.retail_price) : null,
          compare_at_price: v.compare_at_price != null ? parseFloat(v.compare_at_price) : null,
          wholesale_price_standard: v.wholesale_price_standard != null ? parseFloat(v.wholesale_price_standard) : null,
          wholesale_price_preferred: v.wholesale_price_preferred != null ? parseFloat(v.wholesale_price_preferred) : null,
          wholesale_price_vip: v.wholesale_price_vip != null ? parseFloat(v.wholesale_price_vip) : null,
          retail_stock_count: v.retail_stock_count != null ? parseInt(v.retail_stock_count) : null,
          track_stock: v.track_stock ?? false,
          is_active: v.is_active ?? true,
          sort_order: v.sort_order ?? 0,
        };

        if (v.id && existingIds.has(v.id)) {
          // Update existing
          await supabase
            .from("product_variants")
            .update(variantData)
            .eq("id", v.id)
            .eq("roaster_id", roaster.id);
        } else {
          // Insert new
          await supabase
            .from("product_variants")
            .insert(variantData);
        }
      }
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("wholesale_products")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
