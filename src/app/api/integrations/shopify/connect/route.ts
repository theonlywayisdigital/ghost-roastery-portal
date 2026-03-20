import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json(
      { error: "Shop URL is required" },
      { status: 400 }
    );
  }

  // Normalize shop URL — extract just the myshopify.com domain
  // Handles: "https://store.myshopify.com", "store.myshopify.com/", "store.myshopify.com"
  // Also handles accidental prefixes like "Yhttps://store.myshopify.com"
  let normalizedShop = shop.trim().toLowerCase();
  // Strip everything up to and including :// if present
  const protocolIndex = normalizedShop.indexOf("://");
  if (protocolIndex !== -1) {
    normalizedShop = normalizedShop.slice(protocolIndex + 3);
  }
  // Strip trailing slashes and paths
  normalizedShop = normalizedShop.split("/")[0];

  if (!normalizedShop.includes(".myshopify.com")) {
    return NextResponse.json(
      { error: "Please enter a valid Shopify store URL (e.g. mystore.myshopify.com)" },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const redirectUri = process.env.SHOPIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("[shopify] Missing SHOPIFY_CLIENT_ID or SHOPIFY_REDIRECT_URI");
    return NextResponse.json(
      { error: "Shopify integration not configured" },
      { status: 500 }
    );
  }

  // Generate state parameter encoding roaster ID + shop + nonce
  const state = Buffer.from(
    JSON.stringify({
      roasterId: user.roaster.id,
      shop: normalizedShop,
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");

  const scopes = [
    "read_products",
    "write_products",
    "read_inventory",
    "write_inventory",
    "read_orders",
    "read_customers",
  ].join(",");

  const authUrl = `https://${normalizedShop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
