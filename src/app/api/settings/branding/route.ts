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
