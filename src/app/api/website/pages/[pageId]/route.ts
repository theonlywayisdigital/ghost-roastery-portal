import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function getWebsiteForRoaster(roasterId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roasterId)
    .single();
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const website = await getWebsiteForRoaster(roaster.id);
  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const { pageId } = await params;
  const supabase = createServerClient();
  const { data: page, error } = await supabase
    .from("website_pages")
    .select("*")
    .eq("id", pageId)
    .eq("website_id", website.id)
    .single();

  if (error || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json({ page });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const website = await getWebsiteForRoaster(roaster.id);
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const { pageId } = await params;
    const body = await request.json();
    const { title, slug, content, is_published, sort_order, meta_description, meta_title, show_in_nav, show_in_footer } = body;

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("website_pages")
      .select("id")
      .eq("id", pageId)
      .eq("website_id", website.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (is_published !== undefined) updates.is_published = is_published;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (meta_description !== undefined) updates.meta_description = meta_description;
    if (meta_title !== undefined) updates.meta_title = meta_title;
    if (show_in_nav !== undefined) updates.show_in_nav = show_in_nav;
    if (show_in_footer !== undefined) updates.show_in_footer = show_in_footer;

    const { data: page, error } = await supabase
      .from("website_pages")
      .update(updates)
      .eq("id", pageId)
      .select()
      .single();

    if (error) {
      console.error("Website page update error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A page with this slug already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Website page update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const website = await getWebsiteForRoaster(roaster.id);
  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const { pageId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("website_pages")
    .delete()
    .eq("id", pageId)
    .eq("website_id", website.id);

  if (error) {
    console.error("Website page delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
