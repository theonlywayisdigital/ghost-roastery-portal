import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: templates, error } = await applyOwnerFilter(
    supabase.from("social_templates").select("*"),
    owner
  ).order("updated_at", { ascending: false });

  if (error) {
    console.error("Social templates fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch social templates" }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
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
      .from("social_templates")
      .insert({
        roaster_id: owner.owner_id,
        name: body.name || "Untitled Template",
        description: body.description || null,
        caption_structure: body.caption_structure || "",
        hashtag_groups: body.hashtag_groups || [],
        default_platforms: body.default_platforms || [],
        tags: body.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Social template create error:", error);
      return NextResponse.json({ error: "Failed to create social template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Social template create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
