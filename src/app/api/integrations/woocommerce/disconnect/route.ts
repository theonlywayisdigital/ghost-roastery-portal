import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch connection for webhook cleanup
  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, store_url, access_token, api_secret, webhook_ids")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "woocommerce")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No WooCommerce connection found" },
      { status: 404 }
    );
  }

  // Delete webhooks from WooCommerce
  const webhookIds = (connection.webhook_ids as Record<string, number>) || {};
  const authHeader = Buffer.from(
    `${connection.access_token}:${connection.api_secret}`
  ).toString("base64");

  for (const [topic, webhookId] of Object.entries(webhookIds)) {
    try {
      await fetch(
        `https://${connection.store_url}/wp-json/wc/v3/webhooks/${webhookId}?force=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Basic ${authHeader}` },
        }
      );
    } catch (err) {
      console.error(
        `[woocommerce] Failed to delete webhook ${topic} (${webhookId}):`,
        err
      );
    }
  }

  // Delete connection
  const { error } = await supabase
    .from("ecommerce_connections")
    .delete()
    .eq("id", connection.id);

  if (error) {
    console.error("[woocommerce] Failed to disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
