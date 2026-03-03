import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category_ids } = body as { category_ids: string[] };

    if (!Array.isArray(category_ids)) {
      return NextResponse.json({ error: "category_ids array required" }, { status: 400 });
    }

    const supabase = createServerClient();

    for (let i = 0; i < category_ids.length; i++) {
      await supabase
        .from("kb_categories")
        .update({ sort_order: i + 1 })
        .eq("id", category_ids[i]);
    }

    const { data: categories } = await supabase
      .from("kb_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error("Reorder categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
