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
  const updateData: Record<string, unknown> = {
    brand_hero_image_url: body.brand_hero_image_url ?? null,
    brand_about: body.brand_about ?? null,
    brand_instagram: body.brand_instagram ?? null,
    brand_facebook: body.brand_facebook ?? null,
    brand_tiktok: body.brand_tiktok ?? null,
    storefront_type: body.storefront_type || "wholesale",
    retail_enabled:
      body.storefront_type === "retail" || body.storefront_type === "both",
    minimum_wholesale_order: body.minimum_wholesale_order ?? 1,
    storefront_seo_title: body.storefront_seo_title ?? null,
    storefront_seo_description: body.storefront_seo_description ?? null,
    storefront_enabled: body.storefront_enabled ?? false,
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
