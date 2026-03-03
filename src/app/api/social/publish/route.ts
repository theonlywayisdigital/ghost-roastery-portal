import { NextRequest, NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { publishPost } from "@/lib/social/publish";
import type { SocialPost, SocialConnection } from "@/types/social";

export async function POST(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("id", postId)
      .eq("roaster_id", roaster.id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "published" || post.status === "publishing") {
      return NextResponse.json({ error: "Post is already published or publishing" }, { status: 400 });
    }

    // Fetch connections
    const { data: connections } = await supabase
      .from("social_connections")
      .select("*")
      .eq("roaster_id", roaster.id)
      .eq("status", "connected");

    const results = await publishPost(
      post as SocialPost,
      (connections || []) as SocialConnection[],
      supabase
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
