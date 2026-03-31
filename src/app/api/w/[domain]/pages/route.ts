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
    .from("roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: pages, error } = await supabase
    .from("website_pages")
    .select("title, slug, page_type, sort_order")
    .eq("roaster_id", roaster.id)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }

  return NextResponse.json({ pages: pages || [] });
}
