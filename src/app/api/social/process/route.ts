import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { publishPost } from "@/lib/social/publish";
import type { SocialPost, SocialConnection } from "@/types/social";

/**
 * CRON endpoint: process scheduled social posts that are due.
 * Should be called every 5 minutes via external cron (e.g. Vercel Cron).
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find scheduled posts that are due
  const { data: duePosts, error } = await supabase
    .from("social_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Process cron error:", error);
    return NextResponse.json({ error: "Failed to fetch due posts" }, { status: 500 });
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const post of duePosts) {
    try {
      // Fetch connections for this roaster
      const { data: connections } = await supabase
        .from("social_connections")
        .select("*")
        .eq("roaster_id", post.roaster_id)
        .eq("status", "connected");

      await publishPost(
        post as SocialPost,
        (connections || []) as SocialConnection[],
        supabase
      );
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Post ${post.id}: ${msg}`);
      console.error(`Failed to process post ${post.id}:`, err);
    }
  }

  return NextResponse.json({ processed, total: duePosts.length, errors });
}
