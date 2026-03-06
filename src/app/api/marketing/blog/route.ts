import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, is_published, published_at, created_at, updated_at")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Blog posts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }

  return NextResponse.json({ posts: posts || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        roaster_id: roaster.id,
        title,
        slug,
        excerpt: excerpt || null,
        content: content || [],
        featured_image_url: featured_image_url || null,
        is_published: is_published ?? false,
        published_at: is_published ? (published_at || new Date().toISOString()) : null,
        author_name: author_name || null,
        seo_title: seo_title || null,
        seo_description: seo_description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Blog post create error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A blog post with this slug already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create blog post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Blog post create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
