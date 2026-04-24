import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  computeRoastedCostPerKg,
  computeBlendedCostPerKg,
  computeVariantCost,
  computeMarginSuggestion,
  type MarginSettings,
  type BlendComponentInput,
} from "@/lib/margin-calculator";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const greenBeanId = request.nextUrl.searchParams.get("greenBeanId");
  if (!greenBeanId) {
    return NextResponse.json({ error: "greenBeanId is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch the green bean itself for its cost_per_kg
  const { data: greenBean } = await supabase
    .from("green_beans")
    .select("id, name, cost_per_kg")
    .eq("id", greenBeanId)
    .eq("roaster_id", roaster.id)
    .single();

  if (!greenBean) {
    return NextResponse.json({ error: "Green bean not found" }, { status: 404 });
  }

  const greenCostPerKg = greenBean.cost_per_kg ? parseFloat(String(greenBean.cost_per_kg)) : null;
  if (!greenCostPerKg || greenCostPerKg <= 0) {
    return NextResponse.json({ error: "Green bean has no cost set" }, { status: 400 });
  }

  // Build margin settings from roaster
  const r = roaster as Record<string, unknown>;
  const settings: MarginSettings = {
    markup_multiplier: (r.margin_markup_multiplier as number) ?? 3.5,
    wholesale_discount_pct: (r.margin_wholesale_discount_pct as number) ?? 35,
    retail_rounding: (r.margin_retail_rounding as number) ?? 0.05,
    wholesale_rounding: (r.margin_wholesale_rounding as number) ?? 0.05,
    default_weight_loss_pct: (r.default_weight_loss_pct as number) ?? 14,
  };

  // 1. Find all roasted_stock linked to this green bean
  const { data: roastedStocks } = await supabase
    .from("roasted_stock")
    .select("id, name, weight_loss_percentage, green_bean_id")
    .eq("green_bean_id", greenBeanId)
    .eq("roaster_id", roaster.id)
    .eq("is_active", true);

  const roastedStockIds = (roastedStocks || []).map((rs) => rs.id);

  // 2. Find products linked directly via roasted_stock_id
  let directProducts: { id: string; name: string; roasted_stock_id: string | null; is_blend: boolean; margin_multiplier_override: number | null }[] = [];
  if (roastedStockIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, name, roasted_stock_id, is_blend, margin_multiplier_override")
      .in("roasted_stock_id", roastedStockIds)
      .eq("roaster_id", roaster.id)
      .eq("is_blend", false);
    directProducts = data || [];
  }

  // 3. Find blend products that use any of these roasted stocks as a component
  let blendProducts: { id: string; name: string; roasted_stock_id: string | null; is_blend: boolean; margin_multiplier_override: number | null }[] = [];
  if (roastedStockIds.length > 0) {
    const { data: blendComponentRows } = await supabase
      .from("blend_components")
      .select("product_id")
      .in("roasted_stock_id", roastedStockIds);

    const blendProductIds = Array.from(new Set((blendComponentRows || []).map((bc) => bc.product_id)));
    if (blendProductIds.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("id, name, roasted_stock_id, is_blend, margin_multiplier_override")
        .in("id", blendProductIds)
        .eq("roaster_id", roaster.id)
        .eq("is_blend", true);
      blendProducts = data || [];
    }
  }

  const allProducts = [...directProducts, ...blendProducts];
  if (allProducts.length === 0) {
    return NextResponse.json({
      greenBean: { id: greenBean.id, name: greenBean.name, cost_per_kg: greenCostPerKg },
      products: [],
      settings,
    });
  }

  const productIds = allProducts.map((p) => p.id);

  // 4. Fetch all variants for these products
  const { data: allVariants } = await supabase
    .from("product_variants")
    .select("id, product_id, weight_grams, retail_price, wholesale_price, channel, is_active, grind_type_id, grind_type:roaster_grind_types(id, name)")
    .in("product_id", productIds)
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true });

  // 5. For blend products, fetch all their blend components with roasted stock + green bean data
  const blendProductIds = blendProducts.map((p) => p.id);
  let blendComponentsMap: Record<string, BlendComponentInput[]> = {};
  if (blendProductIds.length > 0) {
    const { data: blendComps } = await supabase
      .from("blend_components")
      .select("product_id, percentage, roasted_stock_id, roasted_stock:roasted_stock(id, weight_loss_percentage, green_bean_id, green_beans(cost_per_kg))")
      .in("product_id", blendProductIds);

    for (const bc of blendComps || []) {
      if (!blendComponentsMap[bc.product_id]) {
        blendComponentsMap[bc.product_id] = [];
      }
      const rs = bc.roasted_stock as unknown as { weight_loss_percentage: number | null; green_beans: { cost_per_kg: number | null } | null } | null;
      blendComponentsMap[bc.product_id].push({
        green_cost_per_kg: rs?.green_beans?.cost_per_kg ?? null,
        weight_loss_pct: rs?.weight_loss_percentage ?? null,
        percentage: bc.percentage,
      });
    }
  }

  // 6. Build roasted stock lookup
  const rsLookup: Record<string, { weight_loss_percentage: number | null }> = {};
  for (const rs of roastedStocks || []) {
    rsLookup[rs.id] = { weight_loss_percentage: rs.weight_loss_percentage };
  }

  // 7. Compute suggestions for each variant
  const productsWithVariants = allProducts.map((product) => {
    const variants = (allVariants || []).filter((v) => v.product_id === product.id);

    let roastedCostPerKg: number | null = null;

    if (product.is_blend) {
      const components = blendComponentsMap[product.id] || [];
      roastedCostPerKg = computeBlendedCostPerKg(components, settings.default_weight_loss_pct);
    } else if (product.roasted_stock_id && rsLookup[product.roasted_stock_id]) {
      const rs = rsLookup[product.roasted_stock_id];
      const weightLoss = rs.weight_loss_percentage ?? settings.default_weight_loss_pct;
      roastedCostPerKg = computeRoastedCostPerKg(greenCostPerKg, weightLoss);
    }

    const variantsWithSuggestions = variants.map((v) => {
      const weightGrams = v.weight_grams || 0;
      let suggestion = null;

      if (roastedCostPerKg && weightGrams > 0) {
        const variantCost = computeVariantCost({ weight_grams: weightGrams, roasted_cost_per_kg: roastedCostPerKg });
        suggestion = computeMarginSuggestion(variantCost, settings, product.margin_multiplier_override);
      }

      const currentRetail = v.retail_price ? parseFloat(String(v.retail_price)) : null;
      const currentWholesale = v.wholesale_price ? parseFloat(String(v.wholesale_price)) : null;

      return {
        id: v.id,
        weight_grams: weightGrams,
        channel: v.channel,
        is_active: v.is_active,
        grind_type: v.grind_type,
        current_retail: currentRetail,
        current_wholesale: currentWholesale,
        suggested_retail: suggestion?.suggested_retail ?? null,
        suggested_wholesale: suggestion?.suggested_wholesale ?? null,
        variant_cost: suggestion?.variant_cost ?? null,
        retail_margin_pct: suggestion?.retail_margin_pct ?? null,
        wholesale_margin_pct: suggestion?.wholesale_margin_pct ?? null,
        retail_delta: suggestion && currentRetail != null ? Math.round((suggestion.suggested_retail - currentRetail) * 100) / 100 : null,
        wholesale_delta: suggestion && currentWholesale != null ? Math.round((suggestion.suggested_wholesale - currentWholesale) * 100) / 100 : null,
      };
    });

    return {
      id: product.id,
      name: product.name,
      is_blend: product.is_blend,
      roasted_cost_per_kg: roastedCostPerKg,
      variants: variantsWithSuggestions,
    };
  });

  return NextResponse.json({
    greenBean: { id: greenBean.id, name: greenBean.name, cost_per_kg: greenCostPerKg },
    products: productsWithVariants,
    settings,
  });
}
