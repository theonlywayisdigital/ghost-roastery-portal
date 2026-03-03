import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: template, error } = await applyOwnerFilter(
    supabase.from("social_templates").select("*").eq("id", id),
    owner
  ).single();

  if (error || !template) {
    return NextResponse.json({ error: "Social template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await applyOwnerFilter(
      supabase.from("social_templates").select("id").eq("id", id),
      owner
    ).single();

    if (!existing) {
      return NextResponse.json({ error: "Social template not found" }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = [
      "name", "description", "caption_structure",
      "hashtag_groups", "default_platforms", "tags",
    ];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: template, error } = await applyOwnerFilter(
      supabase.from("social_templates").update(allowedFields).eq("id", id),
      owner
    ).select().single();

    if (error) {
      console.error("Social template update error:", error);
      return NextResponse.json({ error: "Failed to update social template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Social template update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await applyOwnerFilter(
    supabase.from("social_templates").delete().eq("id", id),
    owner
  );

  if (error) {
    console.error("Social template delete error:", error);
    return NextResponse.json({ error: "Failed to delete social template" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
