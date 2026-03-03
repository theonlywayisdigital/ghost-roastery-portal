import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

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

    // Verify ownership (can't edit prebuilt)
    const { data: existing } = await supabase
      .from("email_templates")
      .select("id, roaster_id, is_prebuilt")
      .eq("id", id)
      .single();

    if (!existing || existing.is_prebuilt) {
      return NextResponse.json({ error: "Template not found or not editable" }, { status: 404 });
    }

    // Verify owner matches
    if (owner.owner_type === "roaster" && existing.roaster_id !== owner.owner_id) {
      return NextResponse.json({ error: "Template not found or not editable" }, { status: 404 });
    }
    if (owner.owner_type === "ghost_roastery" && existing.roaster_id !== null) {
      return NextResponse.json({ error: "Template not found or not editable" }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    for (const key of ["name", "description", "category", "content", "thumbnail_url"]) {
      if (key in body) allowedFields[key] = body[key];
    }

    const { data: template, error } = await applyOwnerFilter(
      supabase.from("email_templates").update(allowedFields).eq("id", id),
      owner
    ).select().single();

    if (error) {
      console.error("Template update error:", error);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template update error:", error);
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
    supabase.from("email_templates").delete().eq("id", id).eq("is_prebuilt", false),
    owner
  );

  if (error) {
    console.error("Template delete error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
