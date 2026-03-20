import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * POST: Register (or re-register) Shopify webhooks for the current roaster's connection.
 * Useful after Protected Customer Data access is approved in the Shopify Partner Dashboard,
 * or if webhooks were lost and need re-registering without a full reconnect.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: connection } = await supabase
    .from("ecommerce_connections")
    .select("id, store_url, access_token, webhook_ids")
    .eq("roaster_id", user.roaster.id)
    .eq("provider", "shopify")
    .eq("is_active", true)
    .single();

  if (!connection) {
    return NextResponse.json(
      { error: "No active Shopify connection" },
      { status: 404 }
    );
  }

  const portalUrl =
    process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";
  const webhookUrl = `${portalUrl}/api/webhooks/shopify`;
  const shop = connection.store_url;
  const accessToken = connection.access_token;

  // Delete all existing webhooks first
  try {
    const existingRes = await fetch(
      `https://${shop}/admin/api/2024-01/webhooks.json`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );
    if (existingRes.ok) {
      const existingData = await existingRes.json();
      for (const wh of existingData.webhooks || []) {
        try {
          await fetch(
            `https://${shop}/admin/api/2024-01/webhooks/${wh.id}.json`,
            {
              method: "DELETE",
              headers: { "X-Shopify-Access-Token": accessToken },
            }
          );
        } catch {
          // Best-effort
        }
      }
    }
  } catch {
    // Non-critical
  }

  // Register webhooks
  const webhookTopics = [
    "orders/create",
    "products/update",
    "products/create",
  ];

  const webhookIds: Record<string, string> = {};
  const failures: string[] = [];

  for (const topic of webhookTopics) {
    try {
      const res = await fetch(
        `https://${shop}/admin/api/2024-01/webhooks.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            webhook: { topic, address: webhookUrl, format: "json" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        webhookIds[topic] = String(data.webhook.id);
      } else {
        const errBody = await res.text();
        console.error(
          `[shopify] Webhook registration failed for ${topic}:`,
          errBody
        );
        failures.push(
          `${topic}: ${errBody.includes("protected customer data") ? "Requires Protected Customer Data access in Shopify Partner Dashboard" : errBody}`
        );
      }
    } catch (err) {
      console.error(`[shopify] Webhook error for ${topic}:`, err);
      failures.push(`${topic}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Update stored webhook IDs
  await supabase
    .from("ecommerce_connections")
    .update({ webhook_ids: webhookIds })
    .eq("id", connection.id);

  return NextResponse.json({
    registered: webhookIds,
    failures: failures.length > 0 ? failures : undefined,
    webhook_url: webhookUrl,
  });
}
