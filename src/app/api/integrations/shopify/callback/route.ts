import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const portalUrl = process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !shop || !state) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=missing_params`
    );
  }

  // Decode state first — we need roasterId even if session is lost
  let stateData: { roasterId: string; shop: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=invalid_state`
    );
  }

  if (!stateData.roasterId) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=invalid_state`
    );
  }

  // Try to get the current user session — may be null if cookies were
  // lost during the cross-domain redirect to Shopify and back.
  // If we have a session, verify the roasterId matches.
  const user = await getCurrentUser();
  if (user?.roaster?.id && stateData.roasterId !== user.roaster.id) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=state_mismatch`
    );
  }

  const roasterId = stateData.roasterId;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=not_configured`
    );
  }

  try {
    // Exchange code for offline access token
    const tokenRes = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[shopify] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch shop info
    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    let shopName = shop;
    if (shopRes.ok) {
      const shopData = await shopRes.json();
      shopName = shopData.shop?.name || shop;
    }

    // Normalize store URL for consistent lookups
    let normalizedShop = shop.trim().toLowerCase();
    const protoIdx = normalizedShop.indexOf("://");
    if (protoIdx !== -1) normalizedShop = normalizedShop.slice(protoIdx + 3);
    normalizedShop = normalizedShop.split("/")[0];

    // Delete any existing webhooks for this store before registering new ones
    try {
      const existingWh = await fetch(
        `https://${shop}/admin/api/2024-01/webhooks.json`,
        { headers: { "X-Shopify-Access-Token": accessToken } }
      );
      if (existingWh.ok) {
        const existingData = await existingWh.json();
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
            // Best-effort cleanup
          }
        }
      }
    } catch {
      // Non-critical — continue with registration
    }

    // Register webhooks
    const webhookIds: Record<string, string> = {};
    const webhookTopics = [
      "orders/create",
      "products/update",
      "products/create",
    ];

    const webhookUrl = `${portalUrl}/api/webhooks/shopify`;
    for (const topic of webhookTopics) {
      try {
        const whRes = await fetch(
          `https://${shop}/admin/api/2024-01/webhooks.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
              webhook: {
                topic,
                address: webhookUrl,
                format: "json",
              },
            }),
          }
        );
        if (whRes.ok) {
          const whData = await whRes.json();
          webhookIds[topic] = String(whData.webhook.id);
        } else {
          const whErr = await whRes.text();
          console.error(`[shopify] Webhook registration failed for ${topic}:`, whErr);
        }
      } catch (whErr) {
        console.error(`[shopify] Webhook registration error for ${topic}:`, whErr);
      }
    }

    // Upsert connection using service role client
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: roasterId,
          provider: "shopify",
          store_url: normalizedShop,
          access_token: accessToken,
          shop_name: shopName,
          is_active: true,
          webhook_ids: webhookIds,
          settings: {
            connected_at: new Date().toISOString(),
            scopes: tokenData.scope,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider,store_url" }
      );

    if (upsertError) {
      console.error("[shopify] Failed to save connection:", upsertError);
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?success=shopify`
    );
  } catch (err) {
    console.error("[shopify] OAuth callback error:", err);
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=oauth_failed`
    );
  }
}
