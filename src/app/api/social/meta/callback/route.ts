import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  isMetaConfigured,
  exchangeMetaCode,
  getMetaLongLivedToken,
  getMetaPages,
} from "@/lib/social/meta";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (!isMetaConfigured()) {
    return NextResponse.redirect(
      `${origin}/settings/integrations?tab=social?error=meta_not_configured`
    );
  }

  if (errorParam) {
    console.error("Meta OAuth error:", errorParam);
    return NextResponse.redirect(
      `${origin}/settings/integrations?tab=social?error=meta_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings/integrations?tab=social?error=missing_params`
    );
  }

  try {
    // Decode and verify state
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const { roasterId, nonce } = stateData;

    if (!roasterId || !nonce) {
      return NextResponse.redirect(
        `${origin}/settings/integrations?tab=social?error=invalid_state`
      );
    }

    // Verify nonce from cookie
    const cookieNonce = request.cookies.get("meta_oauth_nonce")?.value;
    if (!cookieNonce || cookieNonce !== nonce) {
      return NextResponse.redirect(
        `${origin}/settings/integrations?tab=social?error=invalid_nonce`
      );
    }

    const redirectUri = `${origin}/api/social/meta/callback`;

    // Exchange code for short-lived token, then get long-lived token
    const shortToken = await exchangeMetaCode(code, redirectUri);
    const longToken = await getMetaLongLivedToken(shortToken.access_token);

    // Get user's pages
    const pages = await getMetaPages(longToken.access_token);

    const supabase = createServerClient();

    if (pages.length > 0) {
      const page = pages[0]; // Use the first page

      // Upsert Facebook connection
      await supabase
        .from("social_connections")
        .upsert(
          {
            roaster_id: roasterId,
            platform: "facebook",
            platform_user_id: null,
            platform_page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            refresh_token: null,
            token_expires_at: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
            scopes: ["pages_manage_posts", "pages_read_engagement"],
            status: "connected",
            connected_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
            metadata: {},
          },
          { onConflict: "roaster_id,platform" }
        );

      // If the page has an Instagram business account, upsert that too
      if (page.instagram_business_account) {
        await supabase
          .from("social_connections")
          .upsert(
            {
              roaster_id: roasterId,
              platform: "instagram",
              platform_user_id: null,
              platform_page_id: page.id,
              page_name: `${page.name} (Instagram)`,
              access_token: page.access_token,
              refresh_token: null,
              token_expires_at: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
              scopes: ["instagram_basic", "instagram_content_publish"],
              status: "connected",
              connected_at: new Date().toISOString(),
              last_used_at: new Date().toISOString(),
              metadata: {
                instagram_business_account_id: page.instagram_business_account.id,
              },
            },
            { onConflict: "roaster_id,platform" }
          );
      }
    }

    const response = NextResponse.redirect(
      `${origin}/settings/integrations?tab=social?connected=meta`
    );
    response.cookies.delete("meta_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Meta callback error:", error);
    return NextResponse.redirect(
      `${origin}/settings/integrations?tab=social?error=callback_failed`
    );
  }
}
