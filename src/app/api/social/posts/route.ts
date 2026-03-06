import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster, getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const sort = searchParams.get("sort") || "updated_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("social_posts")
    .select("*", { count: "exact" })
    .eq("roaster_id", roaster.id);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.ilike("content", `%${search}%`);
  }

  if (from) {
    query = query.gte("scheduled_for", from);
  }

  if (to) {
    query = query.lte("scheduled_for", to);
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: posts, error, count } = await query;

  if (error) {
    console.error("Social posts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  // Get status counts
  const { data: allPosts } = await supabase
    .from("social_posts")
    .select("status")
    .eq("roaster_id", roaster.id);

  const counts = { all: 0, draft: 0, scheduled: 0, published: 0, failed: 0 };
  for (const p of allPosts || []) {
    counts.all++;
    if (p.status === "draft") counts.draft++;
    if (p.status === "scheduled") counts.scheduled++;
    if (p.status === "published") counts.published++;
    if (p.status === "failed" || p.status === "partially_failed") counts.failed++;
  }

  return NextResponse.json({
    posts: posts || [],
    total: count || 0,
    page,
    limit,
    counts,
  });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check social scheduling feature gate
    const featureCheck = await checkFeature(roaster.id as string, "socialScheduling");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.message, upgrade_required: true },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    const body = await request.json();
    const supabase = createServerClient();

    const { data: post, error } = await supabase
      .from("social_posts")
      .insert({
        roaster_id: roaster.id,
        content: body.content || "",
        media_urls: body.media_urls || [],
        platforms: body.platforms || {},
        scheduled_for: body.scheduled_for || null,
        status: body.scheduled_for ? "scheduled" : "draft",
        tags: body.tags || [],
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Social post create error:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Social post create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
