import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get website for this roaster
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) {
    return NextResponse.json({ pages: [] });
  }

  const { data: pages, error } = await supabase
    .from("website_pages")
    .select("id, title, slug, is_published, sort_order, nav_sort_order, footer_sort_order, show_in_nav, show_in_footer, is_nav_button, created_at, updated_at")
    .eq("website_id", website.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Website pages fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }

  return NextResponse.json({ pages: pages || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, is_published, sort_order, meta_description } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get or create website
    let { data: website } = await supabase
      .from("websites")
      .select("id")
      .eq("roaster_id", roaster.id)
      .single();

    if (!website) {
      const { data: newWebsite } = await supabase
        .from("websites")
        .insert({
          roaster_id: roaster.id,
          name: roaster.business_name || "My Website",
        })
        .select("id")
        .single();
      website = newWebsite;
    }

    if (!website) {
      return NextResponse.json({ error: "Failed to create website" }, { status: 500 });
    }

    const { data: page, error } = await supabase
      .from("website_pages")
      .insert({
        website_id: website.id,
        title,
        slug,
        content: content || [],
        is_published: is_published ?? false,
        sort_order: sort_order ?? 0,
        meta_description: meta_description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Website page create error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A page with this slug already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("Website page create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
