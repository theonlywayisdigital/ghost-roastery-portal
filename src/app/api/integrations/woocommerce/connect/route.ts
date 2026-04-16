import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";
import { pushShippingToChannels } from "@/lib/ecommerce-shipping-sync";

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
  const { store_url, consumer_key, consumer_secret } = body as {
    store_url?: string;
    consumer_key?: string;
    consumer_secret?: string;
  };

  if (!store_url || !consumer_key || !consumer_secret) {
    return NextResponse.json(
      { error: "Store URL, consumer key, and consumer secret are required" },
      { status: 400 }
    );
  }

  // Normalize store URL
  let normalizedUrl = store_url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  // Test the connection by calling the WooCommerce system status endpoint
  const baseUrl = `https://${normalizedUrl}`;
  const authHeader = Buffer.from(`${consumer_key}:${consumer_secret}`).toString(
    "base64"
  );

  try {
    const testRes = await fetch(
      `${baseUrl}/wp-json/wc/v3/system_status`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    if (!testRes.ok) {
      const status = testRes.status;
      if (status === 401) {
        return NextResponse.json(
          { error: "Invalid credentials. Check your consumer key and secret." },
          { status: 400 }
        );
      }
      if (status === 404) {
        return NextResponse.json(
          {
            error:
              "WooCommerce REST API not found. Ensure WooCommerce is installed and REST API is enabled.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Connection test failed (HTTP ${status}). Check your store URL and credentials.` },
        { status: 400 }
      );
    }

    const systemData = await testRes.json();
    const shopName =
      systemData.environment?.site_title ||
      systemData.settings?.blogname ||
      normalizedUrl;

    // Register webhooks
    const webhookIds: Record<string, number> = {};
    const portalUrl = process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";
    const webhookUrl = `${portalUrl}/api/webhooks/woocommerce`;
    const webhookTopics = ["order.created", "product.updated"];

    for (const topic of webhookTopics) {
      try {
        const whRes = await fetch(`${baseUrl}/wp-json/wc/v3/webhooks`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Roastery Platform — ${topic}`,
            topic,
            delivery_url: webhookUrl,
            status: "active",
          }),
        });
        if (whRes.ok) {
          const whData = await whRes.json();
          webhookIds[topic] = whData.id;
        }
      } catch (whErr) {
        console.error(
          `[woocommerce] Webhook registration failed for ${topic}:`,
          whErr
        );
      }
    }

    // Store connection
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: user.roaster.id,
          provider: "woocommerce",
          store_url: normalizedUrl,
          access_token: consumer_key,
          api_secret: consumer_secret,
          shop_name: shopName,
          is_active: true,
          webhook_ids: webhookIds,
          settings: {
            connected_at: new Date().toISOString(),
            wc_version: systemData.environment?.version || null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider,store_url" }
      );

    if (upsertError) {
      console.error("[woocommerce] Failed to save connection:", upsertError);
      return NextResponse.json(
        { error: "Failed to save connection" },
        { status: 500 }
      );
    }

    // Push existing shipping methods to the newly connected WooCommerce store (fire-and-forget)
    pushShippingToChannels(user.roaster.id).catch((err) =>
      console.error("[shipping-sync] Post-connect WooCommerce sync failed:", err)
    );

    return NextResponse.json({ success: true, shop_name: shopName });
  } catch (err) {
    console.error("[woocommerce] Connection test error:", err);
    return NextResponse.json(
      {
        error:
          "Could not connect to the store. Check the URL and ensure the site is accessible.",
      },
      { status: 400 }
    );
  }
}
