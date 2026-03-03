import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getGooglePostMetrics } from "@/lib/social/google";
import { getMetaPostMetrics, isMetaConfigured } from "@/lib/social/meta";
import type { SocialConnection } from "@/types/social";

/**
 * CRON endpoint: sync analytics for recently published posts.
 * Should be called every 6 hours via external cron.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find published posts from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error } = await supabase
    .from("social_posts")
    .select("id, roaster_id, platform_post_ids, platforms")
    .in("status", ["published", "partially_failed"])
    .gte("published_at", thirtyDaysAgo)
    .limit(100);

  if (error) {
    console.error("Analytics cron error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  let synced = 0;

  for (const post of posts) {
    const platformPostIds = (post.platform_post_ids || {}) as Record<string, string>;

    // Fetch connections for this roaster
    const { data: connections } = await supabase
      .from("social_connections")
      .select("*")
      .eq("roaster_id", post.roaster_id)
      .eq("status", "connected");

    const connectionMap = new Map<string, SocialConnection>();
    for (const conn of (connections || []) as SocialConnection[]) {
      connectionMap.set(conn.platform, conn);
    }

    for (const [platform, platformPostId] of Object.entries(platformPostIds)) {
      const connection = connectionMap.get(platform);
      if (!connection) continue;

      try {
        let metrics: { impressions?: number; clicks?: number; likes?: number; shares?: number; comments?: number; reach?: number };

        if (platform === "google_business") {
          const gMetrics = await getGooglePostMetrics(connection, platformPostId, supabase);
          metrics = { impressions: gMetrics.impressions, clicks: gMetrics.clicks };
        } else if ((platform === "facebook" || platform === "instagram") && isMetaConfigured()) {
          metrics = await getMetaPostMetrics(connection, platformPostId, platform, supabase);
        } else {
          continue;
        }

        await supabase
          .from("social_post_analytics")
          .upsert(
            {
              post_id: post.id,
              platform,
              impressions: metrics.impressions || 0,
              clicks: metrics.clicks || 0,
              likes: metrics.likes || 0,
              shares: metrics.shares || 0,
              comments: metrics.comments || 0,
              reach: metrics.reach || 0,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "post_id,platform" }
          );

        synced++;
      } catch (err) {
        console.error(`Failed to sync analytics for ${platform} post ${platformPostId}:`, err);
      }
    }
  }

  return NextResponse.json({ synced, total: posts.length });
}
