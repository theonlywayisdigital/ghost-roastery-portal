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

  const { data: campaign, error } = await applyOwnerFilter(
    supabase.from("campaigns").select("*").eq("id", id),
    owner
  ).single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
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
      supabase.from("campaigns").select("id, status").eq("id", id),
      owner
    ).single();

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Don't allow editing sent campaigns
    if (existing.status === "sent" || existing.status === "sending") {
      return NextResponse.json({ error: "Cannot edit a sent campaign" }, { status: 400 });
    }

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = [
      "name", "subject", "preview_text", "from_name", "reply_to",
      "content", "email_bg_color", "template_id", "audience_type", "audience_filter",
      "recipient_count", "status", "scheduled_at",
    ];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: campaign, error } = await applyOwnerFilter(
      supabase.from("campaigns").update(allowedFields).eq("id", id),
      owner
    ).select().single();

    if (error) {
      console.error("Campaign update error:", error);
      return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign update error:", error);
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

  // Verify ownership and draft status
  const { data: existing } = await applyOwnerFilter(
    supabase.from("campaigns").select("id, status").eq("id", id),
    owner
  ).single();

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be deleted" }, { status: 400 });
  }

  const { error } = await applyOwnerFilter(
    supabase.from("campaigns").delete().eq("id", id),
    owner
  );

  if (error) {
    console.error("Campaign delete error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
