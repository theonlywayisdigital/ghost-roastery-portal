import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSageAuthUrl } from "@/lib/sage";
import { checkFeature } from "@/lib/feature-gates";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeature(user.roaster.id, "integrationsAccounting");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, requiredTier: gate.requiredTier }, { status: 403 });
  }

  // Generate a state parameter that encodes the roaster ID for the callback
  const state = Buffer.from(
    JSON.stringify({
      roasterId: user.roaster.id,
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  const authUrl = getSageAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
