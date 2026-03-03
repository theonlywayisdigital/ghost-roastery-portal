import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.audience !== undefined) updates.audience = body.audience;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: category, error } = await supabase
      .from("kb_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("KB category update error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("KB category update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Check for articles in this category
  const { count } = await supabase
    .from("kb_articles")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete category with ${count} article(s). Move or delete them first.` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("kb_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("KB category delete error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
