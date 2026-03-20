import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const { roasted_stock_id, green_bean_id } = body as {
    roasted_stock_id?: string | null;
    green_bean_id?: string | null;
  };

  const supabase = createServerClient();

  // Fetch the mapping and verify ownership
  const { data: mapping } = await supabase
    .from("product_channel_mappings")
    .select(
      `id, product_id, connection_id, roaster_id,
       ecommerce_connections:connection_id (shop_name, provider)`
    )
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!mapping) {
    return NextResponse.json(
      { error: "Mapping not found" },
      { status: 404 }
    );
  }

  const mappingUpdates: Record<string, unknown> = {};
  const productUpdates: Record<string, unknown> = {};

  if (roasted_stock_id !== undefined) {
    mappingUpdates.roasted_stock_id = roasted_stock_id || null;
    productUpdates.roasted_stock_id = roasted_stock_id || null;
  }

  if (green_bean_id !== undefined) {
    mappingUpdates.green_bean_id = green_bean_id || null;
    productUpdates.green_bean_id = green_bean_id || null;
  }

  // Update the mapping
  const { error: mappingError } = await supabase
    .from("product_channel_mappings")
    .update(mappingUpdates)
    .eq("id", id);

  if (mappingError) {
    console.error("[product-mappings] Update mapping error:", mappingError);
    return NextResponse.json(
      { error: "Failed to update mapping" },
      { status: 500 }
    );
  }

  // Update the product too — keeping both in sync
  if (Object.keys(productUpdates).length > 0) {
    const { error: productError } = await supabase
      .from("products")
      .update(productUpdates)
      .eq("id", mapping.product_id);

    if (productError) {
      console.error("[product-mappings] Update product error:", productError);
      // Don't fail — mapping was updated, product is secondary
    }
  }

  // Fetch the stock name for the confirmation message
  let stockName: string | null = null;
  if (roasted_stock_id) {
    const { data: stock } = await supabase
      .from("roasted_stock")
      .select("name")
      .eq("id", roasted_stock_id)
      .single();
    stockName = stock?.name || null;
  } else if (green_bean_id) {
    const { data: bean } = await supabase
      .from("green_beans")
      .select("name")
      .eq("id", green_bean_id)
      .single();
    stockName = bean?.name || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = mapping.ecommerce_connections as any;
  const storeName = (connection?.shop_name as string) || "your store";

  return NextResponse.json({
    success: true,
    stock_name: stockName,
    store_name: storeName,
  });
}
