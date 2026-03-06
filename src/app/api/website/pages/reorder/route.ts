import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const { data: website } = await supabase
      .from("websites")
      .select("id")
      .eq("roaster_id", roaster.id)
      .single();

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const { pages } = await request.json();

    if (!Array.isArray(pages)) {
      return NextResponse.json(
        { error: "pages must be an array" },
        { status: 400 }
      );
    }

    // Update each page's nav/footer visibility, sort orders, and button flag
    for (const page of pages) {
      const { id, show_in_nav, show_in_footer, nav_sort_order, footer_sort_order, is_nav_button } = page;

      if (!id) continue;

      const { error } = await supabase
        .from("website_pages")
        .update({
          show_in_nav,
          show_in_footer,
          nav_sort_order,
          footer_sort_order,
          is_nav_button,
        })
        .eq("id", id)
        .eq("website_id", website.id);

      if (error) {
        console.error(`Failed to update page ${id}:`, error);
        return NextResponse.json(
          { error: `Failed to update page ${id}` },
          { status: 500 }
        );
      }
    }

    // Revalidate public website so nav/footer changes appear immediately
    revalidatePath("/w", "layout");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder pages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
