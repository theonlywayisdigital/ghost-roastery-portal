import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=unauthorized`
    );
  }

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

  // Verify state
  let stateData: { roasterId: string; shop: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=invalid_state`
    );
  }

  if (stateData.roasterId !== user.roaster.id) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=state_mismatch`
    );
  }

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
        }
      } catch (whErr) {
        console.error(`[shopify] Webhook registration failed for ${topic}:`, whErr);
      }
    }

    // Upsert connection
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: user.roaster.id,
          provider: "shopify",
          store_url: shop,
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
