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
    .eq("provider", "squarespace")
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No Squarespace connection found" },
      { status: 404 }
    );
  }

  // Delete webhook subscriptions from Squarespace
  const webhookIds =
    (connection.webhook_ids as Record<string, string>) || {};

  for (const [topic, webhookId] of Object.entries(webhookIds)) {
    try {
      await fetch(
        `https://api.squarespace.com/1.0/webhook_subscriptions/${webhookId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            "User-Agent": "GhostRoastery/1.0",
          },
        }
      );
    } catch (err) {
      console.error(
        `[squarespace] Failed to delete webhook ${topic} (${webhookId}):`,
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
    console.error("[squarespace] Failed to disconnect:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
