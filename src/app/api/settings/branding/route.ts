import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    brand_logo_url: roaster.brand_logo_url || null,
    brand_primary_colour: roaster.brand_primary_colour || "#1A1A1A",
    brand_accent_colour: roaster.brand_accent_colour || "#D97706",
    brand_heading_font: roaster.brand_heading_font || "inter",
    brand_body_font: roaster.brand_body_font || "inter",
    brand_tagline: roaster.brand_tagline || "",
    business_name: roaster.business_name || "",
    storefront_button_colour: roaster.storefront_button_colour || "",
    storefront_button_text_colour: roaster.storefront_button_text_colour || "",
    storefront_bg_colour: roaster.storefront_bg_colour || "",
    storefront_text_colour: roaster.storefront_text_colour || "",
    storefront_button_style: roaster.storefront_button_style || "rounded",
    storefront_logo_size: roaster.storefront_logo_size || "medium",
    brand_hero_image_url: roaster.brand_hero_image_url || "",
    brand_instagram: roaster.brand_instagram || "",
    brand_facebook: roaster.brand_facebook || "",
    brand_tiktok: roaster.brand_tiktok || "",
  });
}

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const updateData = {
    brand_logo_url: body.brand_logo_url ?? null,
    brand_primary_colour: body.brand_primary_colour || "#1A1A1A",
    brand_accent_colour: body.brand_accent_colour || "#D97706",
    brand_heading_font: body.brand_heading_font || "inter",
    brand_body_font: body.brand_body_font || "inter",
    brand_tagline: body.brand_tagline ?? null,
    storefront_button_colour: body.storefront_button_colour ?? null,
    storefront_button_text_colour: body.storefront_button_text_colour ?? null,
    storefront_bg_colour: body.storefront_bg_colour ?? null,
    storefront_text_colour: body.storefront_text_colour ?? null,
    storefront_button_style: body.storefront_button_style || "rounded",
    storefront_logo_size: body.storefront_logo_size || "medium",
    brand_hero_image_url: body.brand_hero_image_url ?? null,
    brand_instagram: body.brand_instagram ?? null,
    brand_facebook: body.brand_facebook ?? null,
    brand_tiktok: body.brand_tiktok ?? null,
  };

  const supabase = createServerClient();

  const { error } = await supabase
    .from("partner_roasters")
    .update(updateData)
    .eq("id", roaster.id);

  if (error) {
    console.error("Branding save error:", error);
    return NextResponse.json({ error: "Failed to save branding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
