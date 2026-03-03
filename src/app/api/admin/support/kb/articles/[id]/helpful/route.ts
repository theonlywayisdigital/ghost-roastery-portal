import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { helpful } = body as { helpful: boolean };

    if (typeof helpful !== "boolean") {
      return NextResponse.json({ error: "helpful (boolean) is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: article } = await supabase
      .from("kb_articles")
      .select("helpful_yes, helpful_no")
      .eq("id", id)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const updates = helpful
      ? { helpful_yes: (article.helpful_yes as number) + 1 }
      : { helpful_no: (article.helpful_no as number) + 1 };

    const { error } = await supabase
      .from("kb_articles")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Helpful vote error:", error);
      return NextResponse.json({ error: "Failed to record vote" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Helpful vote error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
