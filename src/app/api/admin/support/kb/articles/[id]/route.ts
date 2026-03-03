import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: article, error } = await supabase
    .from("kb_articles")
    .select("*, kb_categories(id, name, slug)")
    .eq("id", id)
    .single();

  if (error || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({
    article: {
      ...article,
      category: article.kb_categories || null,
      kb_categories: undefined,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = [
      "title",
      "slug",
      "type",
      "category_id",
      "audience",
      "content",
      "excerpt",
      "video_url",
      "media",
      "tags",
      "is_featured",
      "is_active",
      "sort_order",
    ];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: article, error } = await supabase
      .from("kb_articles")
      .update(allowedFields)
      .eq("id", id)
      .select("*, kb_categories(id, name, slug)")
      .single();

    if (error) {
      console.error("KB article update error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "An article with this slug already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
    }

    return NextResponse.json({
      article: {
        ...article,
        category: article.kb_categories || null,
        kb_categories: undefined,
      },
    });
  } catch (error) {
    console.error("KB article update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("kb_articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("KB article delete error:", error);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
