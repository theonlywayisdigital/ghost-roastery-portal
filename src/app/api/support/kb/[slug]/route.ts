import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const supabase = createServerClient();

  const { data: article, error } = await supabase
    .from("kb_articles")
    .select("*, kb_categories(id, name, slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Increment view count (fire and forget)
  supabase
    .from("kb_articles")
    .update({ view_count: article.view_count + 1 })
    .eq("id", article.id)
    .then();

  return NextResponse.json({
    article: {
      ...article,
      category: article.kb_categories || null,
      kb_categories: undefined,
    },
  });
}
