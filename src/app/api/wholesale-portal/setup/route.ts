import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { step, data } = body;

  if (!step || !data) {
    return NextResponse.json({ error: "step and data are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  let updateData: Record<string, unknown> = {};

  switch (step) {
    case 1: {
      // Validate slug
      const slug = data.storefront_slug as string;
      const slugRegex = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
      if (!slug || !slugRegex.test(slug)) {
        return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
      }

      // Check availability
      const { data: existing } = await supabase
        .from("roasters")
        .select("id")
        .eq("storefront_slug", slug)
        .neq("id", roaster.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
      }

      updateData = { storefront_slug: slug };
      break;
    }
    case 2: {
      const validTypes = ["wholesale", "retail", "both"];
      if (!validTypes.includes(data.storefront_type)) {
        return NextResponse.json({ error: "Invalid storefront type" }, { status: 400 });
      }
      updateData = {
        storefront_type: data.storefront_type,
        retail_enabled: data.storefront_type === "retail" || data.storefront_type === "both",
      };
      break;
    }
    case 3: {
      updateData = {
        brand_logo_url: data.brand_logo_url ?? null,
        brand_primary_colour: data.brand_primary_colour || "#1A1A1A",
        brand_accent_colour: data.brand_accent_colour || "#D97706",
        brand_heading_font: data.brand_heading_font || "inter",
        brand_hero_image_url: data.brand_hero_image_url ?? null,
        brand_tagline: data.brand_tagline ?? null,
      };
      break;
    }
    case 4: {
      updateData = {
        brand_about: data.brand_about ?? null,
        brand_instagram: data.brand_instagram ?? null,
        brand_facebook: data.brand_facebook ?? null,
        brand_tiktok: data.brand_tiktok ?? null,
      };
      break;
    }
    case 6: {
      updateData = {
        storefront_setup_complete: true,
        storefront_enabled: data.storefront_enabled ?? false,
      };
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const { error } = await supabase
    .from("roasters")
    .update(updateData)
    .eq("id", roaster.id);

  if (error) {
    console.error("Setup save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
