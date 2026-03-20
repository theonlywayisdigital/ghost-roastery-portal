import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const portalUrl =
    process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const instanceId = searchParams.get("instanceId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=missing_params`
    );
  }

  // Decode state to get roasterId
  let stateData: { roasterId: string };
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

  // Verify user session if available (may be lost during cross-domain redirect)
  const user = await getCurrentUser();
  if (user?.roaster?.id && stateData.roasterId !== user.roaster.id) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=state_mismatch`
    );
  }

  const roasterId = stateData.roasterId;

  const clientId = process.env.WIX_CLIENT_ID;
  const clientSecret = process.env.WIX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=not_configured`
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[wix] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Fetch site info to get store name
    let shopName = "Wix Store";
    const storeIdentifier = instanceId || "wix";

    try {
      const siteRes = await fetch(
        "https://www.wixapis.com/site-properties/v4/properties",
        {
          headers: {
            Authorization: accessToken,
            "Content-Type": "application/json",
          },
        }
      );
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        shopName =
          siteData.properties?.siteDisplayName ||
          siteData.properties?.businessName ||
          "Wix Store";
      }
    } catch {
      // Non-critical — use default
    }

    // Calculate token expiry (Wix access tokens last 5 minutes)
    const tokenExpiresAt = new Date(
      Date.now() + (tokenData.expires_in || 300) * 1000
    ).toISOString();

    // Register webhooks for order and product events
    const webhookIds: Record<string, string> = {};
    const webhookUrl = `${portalUrl}/api/webhooks/wix`;
    const webhookTopics = [
      "wix.stores.orders.v2.order_created",
      "wix.stores.catalog.v3.product_changed",
    ];

    for (const topic of webhookTopics) {
      try {
        const whRes = await fetch(
          "https://www.wixapis.com/webhooks/v1/hooks",
          {
            method: "POST",
            headers: {
              Authorization: accessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint: webhookUrl,
              events: [topic],
            }),
          }
        );
        if (whRes.ok) {
          const whData = await whRes.json();
          webhookIds[topic] = whData.hook?.id || whData.id || "";
        } else {
          const whErr = await whRes.text();
          console.error(
            `[wix] Webhook registration failed for ${topic}:`,
            whErr
          );
        }
      } catch (whErr) {
        console.error(
          `[wix] Webhook registration error for ${topic}:`,
          whErr
        );
      }
    }

    // Upsert connection
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: roasterId,
          provider: "wix",
          store_url: storeIdentifier,
          access_token: accessToken,
          api_secret: refreshToken, // Store refresh token in api_secret
          shop_name: shopName,
          is_active: true,
          webhook_ids: webhookIds,
          settings: {
            connected_at: new Date().toISOString(),
            instance_id: instanceId,
            token_expires_at: tokenExpiresAt,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider,store_url" }
      );

    if (upsertError) {
      console.error("[wix] Failed to save connection:", upsertError);
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?success=wix`
    );
  } catch (err) {
    console.error("[wix] OAuth callback error:", err);
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=oauth_failed`
    );
  }
}
