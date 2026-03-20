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
    .select("id, access_token, webhook_ids")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "wix")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No Wix connection found" },
      { status: 404 }
    );
  }

  // Delete webhook subscriptions from Wix
  const webhookIds =
    (connection.webhook_ids as Record<string, string>) || {};

  for (const [topic, webhookId] of Object.entries(webhookIds)) {
    if (!webhookId) continue;
    try {
      await fetch(
        `https://www.wixapis.com/webhooks/v1/hooks/${webhookId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: connection.access_token,
          },
        }
      );
    } catch (err) {
      console.error(
        `[wix] Failed to delete webhook ${topic} (${webhookId}):`,
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
    console.error("[wix] Failed to disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
