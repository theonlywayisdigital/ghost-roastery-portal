import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select(
      "id, store_url, shop_name, is_active, sync_products, sync_orders, sync_stock, last_product_sync_at, last_order_sync_at, last_stock_sync_at, settings, created_at, updated_at"
    )
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "woocommerce")
    .single();

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const settings = (connection.settings as Record<string, unknown>) || {};

  return NextResponse.json({
    connected: true,
    is_active: connection.is_active,
    store_url: connection.store_url,
    shop_name: connection.shop_name,
    sync_products: connection.sync_products,
    sync_orders: connection.sync_orders,
    sync_stock: connection.sync_stock,
    last_product_sync_at: connection.last_product_sync_at,
    last_order_sync_at: connection.last_order_sync_at,
    last_stock_sync_at: connection.last_stock_sync_at,
    connected_at: settings.connected_at || connection.created_at,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sync_products, sync_orders, sync_stock } = body as {
    sync_products?: boolean;
    sync_orders?: boolean;
    sync_stock?: boolean;
  };

  const supabase = createServerClient();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "woocommerce")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No WooCommerce connection found" },
      { status: 404 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (sync_products !== undefined) updates.sync_products = sync_products;
  if (sync_orders !== undefined) updates.sync_orders = sync_orders;
  if (sync_stock !== undefined) updates.sync_stock = sync_stock;

  const { error } = await supabase
    .from("ecommerce_connections")
    .update(updates)
    .eq("id", connection.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
