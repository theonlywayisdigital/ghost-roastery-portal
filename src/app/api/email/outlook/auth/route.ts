import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { getOutlookAuthUrl } from "@/lib/email/outlook";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/email/outlook/callback`;
    const nonce = randomBytes(16).toString("hex");

    const url = getOutlookAuthUrl(roaster.id, redirectUri, nonce);

    const response = NextResponse.json({ url });
    response.cookies.set("outlook_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Outlook auth URL error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
