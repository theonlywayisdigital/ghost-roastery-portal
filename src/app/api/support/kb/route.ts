import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine audience based on user roles
  const audienceFilters: string[] = [];
  if (user.roles.includes("admin") || user.roles.includes("super_admin")) {
    audienceFilters.push("admin", "roaster", "customer");
  } else if (user.roles.includes("roaster")) {
    audienceFilters.push("roaster", "customer");
  } else {
    audienceFilters.push("customer");
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || "";
  const category = params.get("category") || "";

  const supabase = createServerClient();

  // Fetch categories visible to this user
  const { data: categories } = await supabase
    .from("kb_categories")
    .select("*")
    .eq("is_active", true)
    .overlaps("audience", audienceFilters)
    .order("sort_order", { ascending: true });

  // Fetch articles
  let articlesQuery = supabase
    .from("kb_articles")
    .select("id, title, slug, type, audience, excerpt, is_featured, category_id, view_count, helpful_yes, helpful_no, tags, video_url, created_at")
    .eq("is_active", true)
    .overlaps("audience", audienceFilters)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (search) {
    articlesQuery = articlesQuery.or(
      `title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`
    );
  }
  if (category) {
    articlesQuery = articlesQuery.eq("category_id", category);
  }

  const { data: articles } = await articlesQuery;

  return NextResponse.json({
    categories: categories || [],
    articles: articles || [],
  });
}
