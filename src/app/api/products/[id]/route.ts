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
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Fetch variants with grind type name and option value junctions
  const { data: variants } = await supabase
    .from("product_variants")
    .select("*, grind_type:roaster_grind_types(id, name), product_variant_option_values(option_value_id)")
    .eq("product_id", id)
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Flatten option_value_ids for each variant
  const variantsWithOptionIds = (variants || []).map((v) => ({
    ...v,
    option_value_ids: (v.product_variant_option_values || []).map(
      (j: { option_value_id: string }) => j.option_value_id
    ),
    product_variant_option_values: undefined,
  }));

  // Fetch option types with values for "other" products
  let option_types: { id: string; name: string; sort_order: number; values: { id: string; value: string; sort_order: number }[] }[] = [];
  if (product.category === "other") {
    const { data: types } = await supabase
      .from("product_option_types")
      .select("id, name, sort_order")
      .eq("product_id", id)
      .eq("roaster_id", roaster.id)
      .order("sort_order", { ascending: true });

    if (types && types.length > 0) {
      const { data: values } = await supabase
        .from("product_option_values")
        .select("id, option_type_id, value, sort_order")
        .eq("product_id", id)
        .eq("roaster_id", roaster.id)
        .order("sort_order", { ascending: true });

      option_types = types.map((t) => ({
        ...t,
        values: (values || []).filter((v: { option_type_id: string }) => v.option_type_id === t.id),
      }));
    }
  }

  return NextResponse.json({ product, variants: variantsWithOptionIds, option_types });
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
      name, description, origin, tasting_notes, price, unit, image_url, status, sort_order,
      is_retail, is_wholesale, retail_price, wholesale_price,
      minimum_wholesale_quantity, sku, weight_grams,
      is_purchasable, track_stock, retail_stock_count,
      meta_description, brand, gtin, google_product_category,
      vat_rate, rrp, order_multiples, subscription_frequency,
      variants, option_types,
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
      .update({
        name,
        origin: origin || null,
        tasting_notes: tasting_notes || null,
        description: description || null,
        price: price != null ? parseFloat(price) : 0,
        unit: unit || "250g",
        image_url: image_url || null,
        status: status || "published",
        sort_order: sort_order ?? 0,
        is_retail: is_retail ?? true,
        is_wholesale: is_wholesale ?? false,
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

    // Handle option types diff FIRST for "other" products — build value text→UUID lookup
    const valueTextToId: Record<string, string> = {};
    if (Array.isArray(option_types)) {
      // Get existing option types
      const { data: existingTypes } = await supabase
        .from("product_option_types")
        .select("id")
        .eq("product_id", id)
        .eq("roaster_id", roaster.id);

      const existingTypeIds = new Set((existingTypes || []).map((t: { id: string }) => t.id));
      const incomingTypeIds = new Set(
        option_types.filter((ot: { id?: string }) => ot.id).map((ot: { id: string }) => ot.id)
      );

      // Delete removed option types (cascades to values and junctions)
      const typesToDelete = Array.from(existingTypeIds).filter((eid) => !incomingTypeIds.has(eid));
      if (typesToDelete.length > 0) {
        await supabase
          .from("product_option_types")
          .delete()
          .in("id", typesToDelete)
          .eq("roaster_id", roaster.id);
      }

      // Upsert option types + values
      for (const ot of option_types) {
        let typeId = ot.id;

        if (ot.id && existingTypeIds.has(ot.id)) {
          // Update existing type
          await supabase
            .from("product_option_types")
            .update({ name: ot.name, sort_order: ot.sort_order ?? 0 })
            .eq("id", ot.id)
            .eq("roaster_id", roaster.id);
        } else {
          // Insert new type
          const { data: inserted } = await supabase
            .from("product_option_types")
            .insert({
              product_id: id,
              roaster_id: roaster.id,
              name: ot.name,
              sort_order: ot.sort_order ?? 0,
            })
            .select("id")
            .single();
          typeId = inserted?.id;
        }

        if (typeId && Array.isArray(ot.values)) {
          // Delete existing values for this type and re-insert
          await supabase
            .from("product_option_values")
            .delete()
            .eq("option_type_id", typeId)
            .eq("roaster_id", roaster.id);

          const valueRows = ot.values.map((v: { value: string; sort_order?: number }, vi: number) => ({
            option_type_id: typeId,
            product_id: id,
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
          unit: v.unit ? String(v.unit) : null,
          grind_type_id: v.grind_type_id || null,
          sku: v.sku || null,
          retail_price: v.retail_price != null ? parseFloat(v.retail_price) : null,
          wholesale_price: v.wholesale_price != null ? parseFloat(v.wholesale_price) : null,
          retail_stock_count: v.retail_stock_count != null ? parseInt(v.retail_stock_count) : null,
          track_stock: v.track_stock ?? false,
          is_active: v.is_active ?? true,
          sort_order: v.sort_order ?? 0,
          channel: v.channel || "retail",
        };

        let variantId = v.id;

        if (v.id && existingIds.has(v.id)) {
          // Update existing
          await supabase
            .from("product_variants")
            .update(variantData)
            .eq("id", v.id)
            .eq("roaster_id", roaster.id);
        } else {
          // Insert new
          const { data: inserted } = await supabase
            .from("product_variants")
            .insert(variantData)
            .select("id")
            .single();
          variantId = inserted?.id;
        }

        // Handle junction rows for "other" product variants
        if (variantId && Array.isArray(v.option_value_ids) && v.option_value_ids.length > 0) {
          // Delete existing junctions for this variant
          await supabase
            .from("product_variant_option_values")
            .delete()
            .eq("variant_id", variantId);

          // Map option_value_ids to real UUIDs — prefer valueTextToId for text placeholders,
          // pass through directly if already a valid UUID (from edit form)
          const realIds = (v.option_value_ids as string[])
            .map((id: string) => {
              if (id.length === 36 && id.includes("-")) {
                return id; // already a real UUID from edit form
              }
              return valueTextToId[id] ?? null;
            })
            .filter((id: string | null): id is string => id != null);

          if (realIds.length > 0) {
            const junctionRows = realIds.map((ovId: string) => ({
              variant_id: variantId,
              option_value_id: ovId,
            }));
            const { error: junctionError } = await supabase
              .from("product_variant_option_values")
              .insert(junctionRows);
            if (junctionError) {
              console.error("Junction insert error:", junctionError.message, junctionRows);
            }
          }
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowed = ["status", "is_retail", "is_wholesale", "sort_order"];
  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updateData[key] = body[key];
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Product patch error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("products")
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
