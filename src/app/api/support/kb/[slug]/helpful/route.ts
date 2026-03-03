import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const body = await request.json();
    const { helpful } = body as { helpful: boolean };

    if (typeof helpful !== "boolean") {
      return NextResponse.json({ error: "helpful (boolean) is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: article } = await supabase
      .from("kb_articles")
      .select("id, helpful_yes, helpful_no")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const updates = helpful
      ? { helpful_yes: (article.helpful_yes as number) + 1 }
      : { helpful_no: (article.helpful_no as number) + 1 };

    await supabase
      .from("kb_articles")
      .update(updates)
      .eq("id", article.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Helpful vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
