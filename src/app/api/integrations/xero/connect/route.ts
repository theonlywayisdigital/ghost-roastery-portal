import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getXeroAuthUrl } from "@/lib/xero";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a state parameter that encodes the roaster ID for the callback
  const state = Buffer.from(
    JSON.stringify({
      roasterId: user.roaster.id,
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  const authUrl = getXeroAuthUrl(state);

  console.log("[xero] OAuth connect — full URL:", authUrl);
  console.log("[xero] ENV check:", {
    client_id: process.env.XERO_CLIENT_ID
      ? `${process.env.XERO_CLIENT_ID.slice(0, 8)}...`
      : "UNDEFINED",
    redirect_uri: process.env.XERO_REDIRECT_URI || "UNDEFINED",
    client_secret_set: !!process.env.XERO_CLIENT_SECRET,
  });

  return NextResponse.redirect(authUrl);
}
