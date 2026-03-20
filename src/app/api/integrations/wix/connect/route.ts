import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.WIX_CLIENT_ID;
  const redirectUri = process.env.WIX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("[wix] Missing WIX_CLIENT_ID or WIX_REDIRECT_URI");
    return NextResponse.json(
      { error: "Wix integration not configured" },
      { status: 500 }
    );
  }

  // Generate state parameter encoding roaster ID + nonce
  const state = Buffer.from(
    JSON.stringify({
      roasterId: user.roaster.id,
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  // Build Wix OAuth authorize URL
  const authUrl = new URL("https://www.wix.com/installer/install");
  authUrl.searchParams.set("appId", clientId);
  authUrl.searchParams.set("redirectUrl", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
