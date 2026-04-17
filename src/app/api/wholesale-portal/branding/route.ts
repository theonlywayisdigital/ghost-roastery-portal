import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Brand identity (logo, colours, fonts, tagline) is managed via /api/settings/branding
  // This route only handles storefront-specific fields
  // Only update fields that are explicitly present in the request body
  const updateData: Record<string, unknown> = {};

  if ("brand_hero_image_url" in body) updateData.brand_hero_image_url = body.brand_hero_image_url ?? null;
  if ("hero_overlay_opacity" in body) updateData.hero_overlay_opacity = body.hero_overlay_opacity || "medium";
  if ("brand_about" in body) updateData.brand_about = body.brand_about ?? null;
  if ("brand_instagram" in body) updateData.brand_instagram = body.brand_instagram ?? null;
  if ("brand_facebook" in body) updateData.brand_facebook = body.brand_facebook ?? null;
  if ("brand_tiktok" in body) updateData.brand_tiktok = body.brand_tiktok ?? null;
  if ("storefront_type" in body) {
    updateData.storefront_type = body.storefront_type || "wholesale";
    updateData.retail_enabled =
      body.storefront_type === "retail" || body.storefront_type === "both";
  }
  // minimum_wholesale_order DB column retained but setting removed — minimum order is handled per-product
  if ("minimum_wholesale_order" in body) updateData.minimum_wholesale_order = body.minimum_wholesale_order ?? 1;
  if ("storefront_seo_title" in body) updateData.storefront_seo_title = body.storefront_seo_title ?? null;
  if ("storefront_seo_description" in body) updateData.storefront_seo_description = body.storefront_seo_description ?? null;
  if ("storefront_logo_size" in body) updateData.storefront_logo_size = body.storefront_logo_size || "medium";
  if ("storefront_enabled" in body) updateData.storefront_enabled = body.storefront_enabled ?? false;
  if ("storefront_nav_colour" in body) updateData.storefront_nav_colour = body.storefront_nav_colour || null;
  if ("storefront_nav_text_colour" in body) updateData.storefront_nav_text_colour = body.storefront_nav_text_colour || null;
  if ("storefront_button_colour" in body) updateData.storefront_button_colour = body.storefront_button_colour || null;
  if ("storefront_button_text_colour" in body) updateData.storefront_button_text_colour = body.storefront_button_text_colour || null;
  if ("storefront_bg_colour" in body) updateData.storefront_bg_colour = body.storefront_bg_colour || null;
  if ("storefront_text_colour" in body) updateData.storefront_text_colour = body.storefront_text_colour || null;
  if ("storefront_button_style" in body) updateData.storefront_button_style = body.storefront_button_style || "rounded";
  if ("storefront_nav_fixed" in body) updateData.storefront_nav_fixed = body.storefront_nav_fixed ?? true;
  if ("storefront_nav_transparent" in body) updateData.storefront_nav_transparent = body.storefront_nav_transparent ?? true;
  if ("storefront_contact_email" in body) updateData.storefront_contact_email = body.storefront_contact_email ?? null;
  if ("storefront_contact_phone" in body) updateData.storefront_contact_phone = body.storefront_contact_phone ?? null;
  if ("storefront_contact_address" in body) updateData.storefront_contact_address = body.storefront_contact_address ?? null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("roasters")
    .update(updateData)
    .eq("id", roaster.id);

  if (error) {
    console.error("Branding save error:", error);
    return NextResponse.json({ error: "Failed to save branding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
