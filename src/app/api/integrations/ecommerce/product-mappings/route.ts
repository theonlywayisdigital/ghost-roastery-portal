import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: mappings, error } = await supabase
    .from("product_channel_mappings")
    .select(
      `
      id,
      product_id,
      connection_id,
      external_product_id,
      external_variant_ids,
      roasted_stock_id,
      green_bean_id,
      sync_status,
      last_synced_at,
      created_at,
      products:product_id (
        id,
        name,
        image_url,
        sku,
        category,
        roasted_stock_id,
        green_bean_id
      ),
      ecommerce_connections:connection_id (
        id,
        provider,
        store_url,
        shop_name
      )
    `
    )
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[product-mappings] Fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mappings" },
      { status: 500 }
    );
  }

  // Fetch roasted stock options
  const { data: roastedStocks } = await supabase
    .from("roasted_stock")
    .select("id, name, current_stock_kg, is_active")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true)
    .order("name");

  // Fetch green bean options
  const { data: greenBeans } = await supabase
    .from("green_beans")
    .select("id, name, current_stock_kg, is_active")
    .eq("roaster_id", user.roaster.id)
    .eq("is_active", true)
    .order("name");

  // Count variants per product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productIds = (mappings || []).map(
    (m) => (m.products as any)?.id
  ).filter(Boolean) as string[];

  let variantCounts: Record<string, number> = {};
  if (productIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("product_id")
      .in("product_id", productIds);
    if (variants) {
      for (const v of variants) {
        variantCounts[v.product_id] =
          (variantCounts[v.product_id] || 0) + 1;
      }
    }
  }

  // Count unmapped (no roasted_stock_id AND no green_bean_id)
  const unmappedCount = (mappings || []).filter(
    (m) => !m.roasted_stock_id && !m.green_bean_id
  ).length;

  return NextResponse.json({
    mappings: (mappings || []).map((m) => ({
      ...m,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variant_count:
        variantCounts[
          (m.products as any)?.id as string
        ] || 0,
    })),
    roasted_stocks: roastedStocks || [],
    green_beans: greenBeans || [],
    unmapped_count: unmappedCount,
  });
}
