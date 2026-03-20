import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const portalUrl = process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL || "";

  // DEBUG MODE — return JSON instead of redirects to diagnose the issue
  // TODO: Remove this after debugging
  const debug = true;
  const debugLog: string[] = [];
  debugLog.push(`portalUrl=${portalUrl}`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const hmac = searchParams.get("hmac");
  const timestamp = searchParams.get("timestamp");

  debugLog.push(`params: code=${code ? "present" : "MISSING"}, shop=${shop || "MISSING"}, state=${state ? "present" : "MISSING"}, error=${error || "none"}, hmac=${hmac ? "present" : "MISSING"}, timestamp=${timestamp || "none"}`);
  debugLog.push(`full_url=${request.url}`);

  if (error) {
    debugLog.push(`EARLY_EXIT: error param = ${error}`);
    if (debug) return NextResponse.json({ step: "error_param", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !shop || !state) {
    debugLog.push(`EARLY_EXIT: missing_params — code=${!!code}, shop=${!!shop}, state=${!!state}`);
    if (debug) return NextResponse.json({ step: "missing_params", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=missing_params`
    );
  }

  // Decode state first — we need roasterId even if session is lost
  let stateData: { roasterId: string; shop: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    debugLog.push(`state decoded: roasterId=${stateData.roasterId}, shop=${stateData.shop}`);
  } catch (e) {
    debugLog.push(`EARLY_EXIT: invalid_state parse error: ${e}`);
    if (debug) return NextResponse.json({ step: "invalid_state", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=invalid_state`
    );
  }

  if (!stateData.roasterId) {
    debugLog.push(`EARLY_EXIT: no roasterId in state`);
    if (debug) return NextResponse.json({ step: "no_roaster_in_state", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=invalid_state`
    );
  }

  const user = await getCurrentUser();
  debugLog.push(`session: user=${user ? user.id : "null"}, roaster=${user?.roaster?.id || "null"}`);

  if (user?.roaster?.id && stateData.roasterId !== user.roaster.id) {
    debugLog.push(`EARLY_EXIT: state_mismatch — state.roasterId=${stateData.roasterId}, user.roaster.id=${user.roaster.id}`);
    if (debug) return NextResponse.json({ step: "state_mismatch", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=state_mismatch`
    );
  }

  const roasterId = stateData.roasterId;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    debugLog.push(`EARLY_EXIT: not_configured — clientId=${!!clientId}, clientSecret=${!!clientSecret}`);
    if (debug) return NextResponse.json({ step: "not_configured", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=not_configured`
    );
  }

  debugLog.push(`Exchanging code for token with shop=${shop}`);

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

    debugLog.push(`tokenRes.status=${tokenRes.status}`);

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      debugLog.push(`EARLY_EXIT: token_exchange_failed — ${errBody}`);
      if (debug) return NextResponse.json({ step: "token_exchange_failed", debugLog });
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    debugLog.push(`token received: hasToken=${!!accessToken}, scope=${tokenData.scope}`);

    // Fetch shop info
    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    let shopName = shop;
    if (shopRes.ok) {
      const shopData = await shopRes.json();
      shopName = shopData.shop?.name || shop;
    }
    debugLog.push(`shopName=${shopName}`);

    // Normalize store URL
    let normalizedShop = shop.trim().toLowerCase();
    const protoIdx = normalizedShop.indexOf("://");
    if (protoIdx !== -1) normalizedShop = normalizedShop.slice(protoIdx + 3);
    normalizedShop = normalizedShop.split("/")[0];
    debugLog.push(`normalizedShop=${normalizedShop}`);

    // Skip webhook setup for debug speed
    debugLog.push(`Attempting DB upsert: roaster_id=${roasterId}, provider=shopify, store_url=${normalizedShop}`);

    // Upsert connection using service role client
    const supabase = createServerClient();
    const { data: upsertData, error: upsertError } = await supabase
      .from("ecommerce_connections")
      .upsert(
        {
          roaster_id: roasterId,
          provider: "shopify",
          store_url: normalizedShop,
          access_token: accessToken,
          shop_name: shopName,
          is_active: true,
          webhook_ids: {},
          settings: {
            connected_at: new Date().toISOString(),
            scopes: tokenData.scope,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider,store_url" }
      )
      .select();

    if (upsertError) {
      debugLog.push(`EARLY_EXIT: save_failed — ${JSON.stringify(upsertError)}`);
      if (debug) return NextResponse.json({ step: "save_failed", debugLog });
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=save_failed`
      );
    }

    debugLog.push(`SUCCESS — upserted: ${JSON.stringify(upsertData)}`);

    if (debug) return NextResponse.json({ step: "success", debugLog });

    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?success=shopify`
    );
  } catch (err) {
    debugLog.push(`CATCH: ${err instanceof Error ? err.message : String(err)}`);
    if (debug) return NextResponse.json({ step: "catch_error", debugLog });
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=oauth_failed`
    );
  }
}
