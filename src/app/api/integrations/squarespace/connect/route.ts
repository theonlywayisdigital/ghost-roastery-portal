import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeature(user.roaster.id, "integrationsEcommerce");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, requiredTier: gate.requiredTier }, { status: 403 });
  }

  const body = await request.json();
  const { api_key } = body as { api_key?: string };

  if (!api_key) {
    return NextResponse.json(
      { error: "API key is required" },
      { status: 400 }
    );
  }

  const baseUrl = "https://api.squarespace.com/1.0";

  try {
    // Test the connection by calling the Squarespace website info endpoint
    const testRes = await fetch(`${baseUrl}/commerce/products?limit=1`, {
      headers: {
        Authorization: `Bearer ${api_key}`,
        "User-Agent": "GhostRoastery/1.0",
      },
    });

    if (!testRes.ok) {
      const status = testRes.status;
      if (status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Check your Squarespace API key." },
          { status: 400 }
        );
      }
      if (status === 403) {
        return NextResponse.json(
          {
            error:
              "API key does not have Commerce permissions. Ensure you've granted the correct scopes.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: `Connection test failed (HTTP ${status}). Check your API key.`,
        },
        { status: 400 }
      );
    }

    // Try to get site info for the shop name
    let shopName = "Squarespace Store";
    let storeUrl = "squarespace.com";
    try {
      const siteRes = await fetch(`${baseUrl}/commerce/inventory`, {
        headers: {
          Authorization: `Bearer ${api_key}`,
          "User-Agent": "GhostRoastery/1.0",
        },
      });
      if (siteRes.ok) {
        // If inventory endpoint works, the API key has Commerce access
        // Use a profile endpoint to get the site title if available
        const profileRes = await fetch(
          "https://api.squarespace.com/1.0/profiles/me",
          {
            headers: {
              Authorization: `Bearer ${api_key}`,
              "User-Agent": "GhostRoastery/1.0",
            },
          }
        );
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          shopName =
            profileData.websiteTitle ||
            profileData.siteTitle ||
            "Squarespace Store";
          storeUrl = profileData.baseUrl
            ? profileData.baseUrl
                .replace(/^https?:\/\//, "")
                .replace(/\/$/, "")
            : "squarespace.com";
        }
      }
    } catch {
      // Non-critical — use defaults
    }

    // Register webhook subscriptions
    const webhookIds: Record<string, string> = {};
    const portalUrl =
      process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const webhookEndpoints = [
      {
        topic: "order.create",
        url: `${portalUrl}/api/webhooks/squarespace`,
      },
      {
        topic: "extension.product.update",
        url: `${portalUrl}/api/webhooks/squarespace`,
      },
    ];

    for (const webhook of webhookEndpoints) {
      try {
        const whRes = await fetch(
          `https://api.squarespace.com/1.0/webhook_subscriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${api_key}`,
              "Content-Type": "application/json",
              "User-Agent": "GhostRoastery/1.0",
            },
            body: JSON.stringify({
              endpointUrl: webhook.url,
              topics: [webhook.topic],
            }),
          }
        );
        if (whRes.ok) {
          const whData = await whRes.json();
          webhookIds[webhook.topic] = whData.id || whData.subscriptionId;
        }
      } catch (whErr) {
        console.error(
          `[squarespace] Webhook registration failed for ${webhook.topic}:`,
          whErr
        );
      }
    }

    // Store connection
    const supabase = createServerClient();
    const normalizedUrl = storeUrl.toLowerCase().replace(/\/$/, "");

    const { error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: user.roaster.id,
          provider: "squarespace",
          store_url: normalizedUrl,
          access_token: api_key,
          shop_name: shopName,
          is_active: true,
          webhook_ids: webhookIds,
          settings: {
            connected_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider,store_url" }
      );

    if (upsertError) {
      console.error("[squarespace] Failed to save connection:", upsertError);
      return NextResponse.json(
        { error: "Failed to save connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, shop_name: shopName });
  } catch (err) {
    console.error("[squarespace] Connection test error:", err);
    return NextResponse.json(
      {
        error:
          "Could not connect to Squarespace. Check your API key and try again.",
      },
      { status: 400 }
    );
  }
}
