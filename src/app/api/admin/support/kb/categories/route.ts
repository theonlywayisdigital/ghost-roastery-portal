import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: categories, error } = await supabase
    .from("kb_categories")
    .select("*, kb_articles(count)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("KB categories fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }

  const mapped = (categories || []).map((c) => ({
    ...c,
    article_count: c.kb_articles?.[0]?.count ?? 0,
    kb_articles: undefined,
  }));

  return NextResponse.json({ categories: mapped });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Auto-generate slug from name if not provided
    const slug =
      body.slug ||
      body.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    if (!body.name || !slug) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get max sort_order
    const { data: last } = await supabase
      .from("kb_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data: category, error } = await supabase
      .from("kb_categories")
      .insert({
        name: body.name,
        slug,
        audience: body.audience || [],
        sort_order: (last?.sort_order ?? 0) + 1,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("KB category create error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("KB category create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
