import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { exchangeGmailCode, getGmailUserEmail } from "@/lib/email/gmail";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const redirectBase = `${origin}/settings/integrations?tab=communications`;

  if (errorParam) {
    console.error("Gmail OAuth error:", errorParam);
    return NextResponse.redirect(`${redirectBase}&error=gmail_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}&error=missing_params`);
  }

  try {
    // Decode and verify state
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const { roasterId, nonce } = stateData;

    if (!roasterId || !nonce) {
      return NextResponse.redirect(`${redirectBase}&error=invalid_state`);
    }

    // Verify nonce from cookie
    const cookieNonce = request.cookies.get("gmail_oauth_nonce")?.value;
    if (!cookieNonce || cookieNonce !== nonce) {
      return NextResponse.redirect(`${redirectBase}&error=invalid_nonce`);
    }

    const redirectUri = `${origin}/api/email/gmail/callback`;
    const tokens = await exchangeGmailCode(code, redirectUri);

    // Fetch the user's email address
    const emailAddress = await getGmailUserEmail(tokens.access_token);

    // Upsert the connection
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("email_connections")
      .upsert(
        {
          roaster_id: roasterId,
          provider: "gmail",
          email_address: emailAddress,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scopes: ["gmail.readonly", "gmail.send"],
          status: "connected",
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          metadata: {},
        },
        { onConflict: "roaster_id,provider" }
      );

    if (upsertError) {
      console.error("Gmail connection upsert error:", upsertError);
      return NextResponse.redirect(`${redirectBase}&error=save_failed`);
    }

    const response = NextResponse.redirect(`${redirectBase}&connected=gmail`);
    response.cookies.delete("gmail_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(`${redirectBase}&error=callback_failed`);
  }
}
