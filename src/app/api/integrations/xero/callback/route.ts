import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { exchangeCodeForTokens, fetchXeroConnections } from "@/lib/xero";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=unauthorized`
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";

  if (error) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=missing_code`
    );
  }

  // Verify state contains the correct roaster ID
  let stateData: { roasterId: string };
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

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the Xero tenant/organisation
    const connections = await fetchXeroConnections(tokens.access_token);

    if (!connections || connections.length === 0) {
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=no_organisation`
      );
    }

    // Use the first connected organisation
    const org = connections[0];
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Upsert the integration record
    const supabase = createServerClient();
    const { error: upsertError } = await supabase
      .from("roaster_integrations")
      .upsert(
        {
          roaster_id: user.roaster.id,
          provider: "xero",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          tenant_id: org.tenantId,
          is_active: true,
          settings: {
            tenant_name: org.tenantName,
            auto_sync: true,
            connected_at: new Date().toISOString(),
            error: null,
            error_at: null,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "roaster_id,provider" }
      );

    if (upsertError) {
      console.error("Failed to save Xero integration:", upsertError);
      return NextResponse.redirect(
        `${portalUrl}/settings/integrations?error=save_failed`
      );
    }

    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?success=xero`
    );
  } catch (err) {
    console.error("Xero OAuth callback error:", err);
    return NextResponse.redirect(
      `${portalUrl}/settings/integrations?error=oauth_failed`
    );
  }
}
