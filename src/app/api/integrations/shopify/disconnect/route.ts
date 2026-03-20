import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch connection to get webhook IDs and access token for cleanup
  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, store_url, access_token, webhook_ids")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "shopify")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No Shopify connection found" },
      { status: 404 }
    );
  }

  // Delete webhooks from Shopify
  const webhookIds = (connection.webhook_ids as Record<string, string>) || {};
  for (const [topic, webhookId] of Object.entries(webhookIds)) {
    try {
      await fetch(
        `https://${connection.store_url}/admin/api/2024-01/webhooks/${webhookId}.json`,
        {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": connection.access_token || "",
          },
        }
      );
    } catch (err) {
      console.error(`[shopify] Failed to delete webhook ${topic} (${webhookId}):`, err);
    }
  }

  // Delete connection from database
  const { error } = await supabase
    .from("ecommerce_connections")
    .delete()
    .eq("id", connection.id);

  if (error) {
    console.error("[shopify] Failed to disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
