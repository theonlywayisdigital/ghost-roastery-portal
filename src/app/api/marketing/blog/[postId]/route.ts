import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const supabase = createServerClient();
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", postId)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await params;
    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      is_published,
      published_at,
      author_name,
      seo_title,
      seo_description,
    } = body;

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id, is_published")
      .eq("id", postId)
      .eq("roaster_id", roaster.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (content !== undefined) updates.content = content;
    if (featured_image_url !== undefined) updates.featured_image_url = featured_image_url;
    if (author_name !== undefined) updates.author_name = author_name;
    if (seo_title !== undefined) updates.seo_title = seo_title;
    if (seo_description !== undefined) updates.seo_description = seo_description;

    if (is_published !== undefined) {
      updates.is_published = is_published;
      // Set published_at when first publishing
      if (is_published && !existing.is_published) {
        updates.published_at = published_at || new Date().toISOString();
      }
    }

    const { data: post, error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      console.error("Blog post update error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A blog post with this slug already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update blog post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Blog post update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", postId)
    .eq("roaster_id", roaster.id);

  if (error) {
    console.error("Blog post delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
