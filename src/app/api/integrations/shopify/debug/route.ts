import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET ? "SET" : "NOT SET";
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
  const portalUrl = process.env.PORTAL_URL;
  const nextPublicPortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;

  // Check what Shopify would see
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  let authUrl = null;
  if (shop && clientId && redirectUri) {
    const normalizedShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    authUrl = `https://${normalizedShop}/admin/oauth/authorize?client_id=${clientId}&scope=read_products&redirect_uri=${encodeURIComponent(redirectUri)}&state=debug`;
  }

  return NextResponse.json({
    env: {
      SHOPIFY_CLIENT_ID: clientId || "NOT SET",
      SHOPIFY_CLIENT_SECRET: clientSecret,
      SHOPIFY_REDIRECT_URI: redirectUri || "NOT SET",
      PORTAL_URL: portalUrl || "NOT SET",
      NEXT_PUBLIC_PORTAL_URL: nextPublicPortalUrl || "NOT SET",
    },
    user: {
      authenticated: !!user,
      hasRoaster: !!user?.roaster?.id,
      roasterId: user?.roaster?.id || null,
    },
    request: {
      url: request.url,
      host: request.headers.get("host"),
    },
    authUrl,
  });
}
