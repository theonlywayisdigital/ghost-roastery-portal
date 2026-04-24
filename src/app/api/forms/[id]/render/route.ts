import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id, name, description, form_type, fields, settings, branding, roaster_id, roasters(business_name, brand_logo_url, brand_accent_colour, brand_primary_colour, brand_heading_font, brand_body_font, storefront_button_colour, storefront_button_text_colour, storefront_bg_colour, storefront_text_colour, storefront_button_style)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!form) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  return NextResponse.json({ form });
}
