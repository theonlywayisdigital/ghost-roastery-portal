import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const search = params.get("search") || "";
  const type = params.get("type") || "";
  const category = params.get("category") || "";
  const audience = params.get("audience") || "";
  const status = params.get("status") || "";
  const sort = params.get("sort") || "updated_at";
  const order = params.get("order") || "desc";
  const offset = (page - 1) * pageSize;

  const supabase = createServerClient();

  let query = supabase
    .from("kb_articles")
    .select("*, kb_categories(id, name, slug)", { count: "exact" });

  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (category) {
    query = query.eq("category_id", category);
  }
  if (audience) {
    query = query.contains("audience", [audience]);
  }
  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "draft") {
    query = query.eq("is_active", false);
  }

  query = query
    .order(sort, { ascending: order === "asc" })
    .range(offset, offset + pageSize - 1);

  const { data: articles, error, count } = await query;

  if (error) {
    console.error("KB articles fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }

  // Map category join
  const mapped = (articles || []).map((a) => ({
    ...a,
    category: a.kb_categories || null,
    kb_categories: undefined,
  }));

  return NextResponse.json({
    data: mapped,
    total: count || 0,
    page,
    pageSize,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const slug =
      body.slug ||
      body.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    if (!body.title || !slug) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: article, error } = await supabase
      .from("kb_articles")
      .insert({
        title: body.title,
        slug,
        type: body.type || "faq",
        category_id: body.category_id || null,
        audience: body.audience || [],
        content: body.content || "",
        excerpt: body.excerpt || "",
        video_url: body.video_url || null,
        media: body.media || [],
        tags: body.tags || [],
        is_featured: body.is_featured ?? false,
        is_active: body.is_active ?? false,
        sort_order: body.sort_order ?? 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("KB article create error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "An article with this slug already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("KB article create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
