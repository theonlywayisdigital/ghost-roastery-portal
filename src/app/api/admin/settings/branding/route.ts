import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1)
    .single();

  return NextResponse.json({
    brand_logo_url: settings?.brand_logo_url || null,
    brand_primary_colour: settings?.brand_primary_colour || "#1A1A1A",
    brand_accent_colour: settings?.brand_accent_colour || "#D97706",
    brand_heading_font: settings?.brand_heading_font || "inter",
    brand_body_font: settings?.brand_body_font || "inter",
    brand_tagline: settings?.brand_tagline || "",
    business_name: "Ghost Roastery",
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
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
    updated_at: new Date().toISOString(),
  };

  const supabase = createServerClient();

  const { error } = await supabase
    .from("platform_settings")
    .update(updateData)
    .eq("id", (await supabase.from("platform_settings").select("id").limit(1).single()).data?.id);

  if (error) {
    console.error("Platform branding save error:", error);
    return NextResponse.json({ error: "Failed to save branding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
