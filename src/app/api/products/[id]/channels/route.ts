import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productId } = await params;
  const supabase = createServerClient();
  const roasterId = user.roaster.id;

  // Fetch all active ecommerce connections for this roaster
  const { data: connections } = await supabase
    .from("ecommerce_connections")
    .select("id, provider, shop_name, store_url")
    .eq("roaster_id", roasterId)
    .eq("is_active", true);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ connections: [], published: [] });
  }

  // Fetch mappings for this product
  const { data: mappings } = await supabase
    .from("product_channel_mappings")
    .select("connection_id")
    .eq("product_id", productId)
    .eq("roaster_id", roasterId);

  const mappedConnectionIds = new Set(
    (mappings || []).map((m) => m.connection_id)
  );

  const published = connections
    .filter((c) => mappedConnectionIds.has(c.id))
    .map((c) => ({
      connection_id: c.id,
      provider: c.provider,
      shop_name: c.shop_name,
    }));

  return NextResponse.json({
    connections: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      shop_name: c.shop_name,
      store_url: c.store_url,
    })),
    published,
  });
}
