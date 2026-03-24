import type { SocialConnection, SocialPost, SocialPlatform, PublishResult } from "@/types/social";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishToMeta, isMetaConfigured } from "./meta";
import { createNotification } from "@/lib/notifications";

/**
 * Publish a post to all enabled platforms.
 * Handles partial failures: if some platforms succeed and others fail,
 * the post is marked as "partially_failed" with per-platform error details.
 */
export async function publishPost(
  post: SocialPost,
  connections: SocialConnection[],
  supabase: SupabaseClient
): Promise<PublishResult[]> {
  // Mark post as publishing
  await supabase
    .from("social_posts")
    .update({ status: "publishing" })
    .eq("id", post.id);

  const results: PublishResult[] = [];
  const platformPostIds: Record<string, string> = { ...post.platform_post_ids };
  const failures: Record<string, string> = {};

  // Determine which platforms to publish to
  const enabledPlatforms: SocialPlatform[] = [];
  if (post.platforms.facebook?.enabled) enabledPlatforms.push("facebook");
  if (post.platforms.instagram?.enabled) enabledPlatforms.push("instagram");

  for (const platform of enabledPlatforms) {
    const connection = connections.find(
      (c) => c.platform === platform && c.status === "connected"
    );

    if (!connection) {
      results.push({ platform, success: false, error: "No active connection" });
      failures[platform] = "No active connection";
      continue;
    }

    try {
      if (platform === "facebook" || platform === "instagram") {
        if (!isMetaConfigured()) {
          results.push({ platform, success: false, error: "Meta integration not configured" });
          failures[platform] = "Meta integration not configured";
          continue;
        }
        const result = await publishToMeta(connection, post, platform, supabase);
        platformPostIds[platform] = result.id;
        results.push({ platform, success: true, platform_post_id: result.id });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ platform, success: false, error: errorMsg });
      failures[platform] = errorMsg;
    }
  }

  // Determine final status
  const successes = results.filter((r) => r.success).length;
  const total = results.length;

  let finalStatus: string;
  if (total === 0) {
    finalStatus = "failed";
  } else if (successes === total) {
    finalStatus = "published";
  } else if (successes === 0) {
    finalStatus = "failed";
  } else {
    finalStatus = "partially_failed";
  }

  // Update post in database
  const updateData: Record<string, unknown> = {
    status: finalStatus,
    platform_post_ids: platformPostIds,
  };

  if (successes > 0) {
    updateData.published_at = new Date().toISOString();
  }

  if (Object.keys(failures).length > 0) {
    updateData.failure_reason = failures;
  }

  await supabase
    .from("social_posts")
    .update(updateData)
    .eq("id", post.id);

  // Send notification
  if (post.created_by) {
    if (finalStatus === "published") {
      await createNotification({
        userId: post.created_by,
        type: "social_post_published",
        title: "Post published",
        body: `Your social post was published to ${enabledPlatforms.join(", ")}.`,
        link: `/marketing/social/${post.id}`,
      });
    } else if (finalStatus === "failed" || finalStatus === "partially_failed") {
      await createNotification({
        userId: post.created_by,
        type: "social_post_failed",
        title: finalStatus === "failed" ? "Post failed" : "Post partially failed",
        body: `Some platforms failed: ${Object.entries(failures).map(([p, e]) => `${p}: ${e}`).join("; ")}`,
        link: `/marketing/social/${post.id}`,
      });
    }
  }

  return results;
}
