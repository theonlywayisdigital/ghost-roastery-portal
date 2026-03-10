import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const supabase = createServerClient();

  // Look up roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 50) : 50;

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, featured_image_url, published_at, author_name")
    .eq("roaster_id", roaster.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 });
  }

  return NextResponse.json({ posts: posts || [] });
}
