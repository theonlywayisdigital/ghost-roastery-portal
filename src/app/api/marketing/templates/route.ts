import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch prebuilt templates
  const { data: prebuilt } = await supabase
    .from("email_templates")
    .select("*")
    .eq("is_prebuilt", true)
    .order("name");

  // Fetch owner's own templates
  const { data: custom } = await applyOwnerFilter(
    supabase.from("email_templates").select("*").eq("is_prebuilt", false),
    owner
  ).order("updated_at", { ascending: false });

  return NextResponse.json({
    prebuilt: prebuilt || [],
    custom: custom || [],
  });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const { data: template, error } = await supabase
      .from("email_templates")
      .insert({
        roaster_id: owner.owner_id,
        name: body.name || "Untitled Template",
        description: body.description || null,
        category: body.category || "general",
        content: body.content || [],
        thumbnail_url: body.thumbnail_url || null,
        is_prebuilt: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Template create error:", error);
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
