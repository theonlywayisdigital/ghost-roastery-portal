import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { exchangeGoogleCode, getGoogleAccounts, getGoogleLocations } from "@/lib/social/google";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    console.error("Google OAuth error:", errorParam);
    return NextResponse.redirect(
      `${origin}/marketing/social/connections?error=google_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/marketing/social/connections?error=missing_params`
    );
  }

  try {
    // Decode and verify state
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const { roasterId, nonce } = stateData;

    if (!roasterId || !nonce) {
      return NextResponse.redirect(
        `${origin}/marketing/social/connections?error=invalid_state`
      );
    }

    // Verify nonce from cookie
    const cookieNonce = request.cookies.get("google_oauth_nonce")?.value;
    if (!cookieNonce || cookieNonce !== nonce) {
      return NextResponse.redirect(
        `${origin}/marketing/social/connections?error=invalid_nonce`
      );
    }

    const redirectUri = `${origin}/api/social/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    // Fetch Google Business accounts and locations
    let pageName = "Google Business Profile";
    let platformPageId: string | null = null;
    let platformUserId: string | null = null;

    try {
      const { accounts } = await getGoogleAccounts(tokens.access_token);
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        platformUserId = account.name;

        const { locations } = await getGoogleLocations(tokens.access_token, account.name);
        if (locations && locations.length > 0) {
          platformPageId = locations[0].name;
          pageName = locations[0].title || account.accountName || pageName;
        } else {
          pageName = account.accountName || pageName;
        }
      }
    } catch (err) {
      console.error("Failed to fetch Google accounts/locations:", err);
      // Continue — we still have valid tokens
    }

    // Upsert the connection
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("social_connections")
      .upsert(
        {
          roaster_id: roasterId,
          platform: "google_business",
          platform_user_id: platformUserId,
          platform_page_id: platformPageId,
          page_name: pageName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scopes: ["business.manage"],
          status: "connected",
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          metadata: {},
        },
        { onConflict: "roaster_id,platform" }
      );

    if (upsertError) {
      console.error("Google connection upsert error:", upsertError);
      return NextResponse.redirect(
        `${origin}/marketing/social/connections?error=save_failed`
      );
    }

    // Clear the nonce cookie and redirect
    const response = NextResponse.redirect(
      `${origin}/marketing/social/connections?connected=google`
    );
    response.cookies.delete("google_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      `${origin}/marketing/social/connections?error=callback_failed`
    );
  }
}
