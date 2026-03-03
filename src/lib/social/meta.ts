import type { SocialConnection, SocialPost, SocialPlatform } from "@/types/social";
import type { SupabaseClient } from "@supabase/supabase-js";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API = "https://graph.facebook.com/v19.0";

/**
 * Check if Meta/Facebook integration is configured.
 */
export function isMetaConfigured(): boolean {
  return !!META_APP_ID && !!META_APP_SECRET;
}

export class MetaNotConfiguredError extends Error {
  constructor() {
    super("Meta integration is not configured. Set META_APP_ID and META_APP_SECRET.");
    this.name = "MetaNotConfiguredError";
  }
}

function assertConfigured() {
  if (!isMetaConfigured()) {
    throw new MetaNotConfiguredError();
  }
}

/**
 * Build the Meta/Facebook OAuth URL.
 */
export function getMetaAuthUrl(roasterId: string, redirectUri: string, nonce: string): string {
  assertConfigured();
  const state = Buffer.from(JSON.stringify({ roasterId, nonce })).toString("base64url");
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish",
    state,
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for a short-lived token.
 */
export async function exchangeMetaCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  assertConfigured();
  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    client_secret: META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params.toString()}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Exchange short-lived token for a long-lived token (~60 days).
 */
export async function getMetaLongLivedToken(
  shortToken: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  assertConfigured();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID!,
    client_secret: META_APP_SECRET!,
    fb_exchange_token: shortToken,
  });

  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params.toString()}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta long-lived token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Get user's Facebook pages with their page access tokens.
 */
export async function getMetaPages(
  userAccessToken: string
): Promise<Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }>> {
  const res = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch Meta pages: ${err}`);
  }

  const data = await res.json();
  return data.data || [];
}

/**
 * Publish a post to Facebook or Instagram.
 */
export async function publishToMeta(
  connection: SocialConnection,
  post: SocialPost,
  platform: "facebook" | "instagram",
  supabase: SupabaseClient
): Promise<{ id: string }> {
  assertConfigured();

  const pageToken = connection.access_token;
  if (!pageToken) {
    throw new Error("No access token for Meta connection");
  }

  let result: { id: string };

  if (platform === "facebook") {
    result = await publishToFacebook(connection, post, pageToken);
  } else {
    result = await publishToInstagram(connection, post, pageToken);
  }

  // Update last_used_at
  await supabase
    .from("social_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", connection.id);

  return result;
}

async function publishToFacebook(
  connection: SocialConnection,
  post: SocialPost,
  pageToken: string
): Promise<{ id: string }> {
  const pageId = connection.platform_page_id;
  if (!pageId) throw new Error("No Facebook page ID configured");

  // Photo post
  if (post.media_urls.length > 0 && !post.media_urls[0].match(/\.(mp4|mov)$/i)) {
    if (post.media_urls.length === 1) {
      // Single photo
      const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: post.media_urls[0],
          message: post.content,
          access_token: pageToken,
        }),
      });
      if (!res.ok) throw new Error(`Facebook photo post failed: ${await res.text()}`);
      return res.json();
    }

    // Multi-photo: upload each as unpublished, then create post
    const photoIds: string[] = [];
    for (const url of post.media_urls) {
      const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          published: false,
          access_token: pageToken,
        }),
      });
      if (!res.ok) throw new Error(`Facebook photo upload failed: ${await res.text()}`);
      const data = await res.json();
      photoIds.push(data.id);
    }

    const attachedMedia = photoIds.reduce(
      (acc, id, i) => ({ ...acc, [`attached_media[${i}]`]: JSON.stringify({ media_fbid: id }) }),
      {} as Record<string, string>
    );

    const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: post.content,
        ...attachedMedia,
        access_token: pageToken,
      }),
    });
    if (!res.ok) throw new Error(`Facebook multi-photo post failed: ${await res.text()}`);
    return res.json();
  }

  // Text-only post
  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: post.content,
      access_token: pageToken,
    }),
  });
  if (!res.ok) throw new Error(`Facebook post failed: ${await res.text()}`);
  return res.json();
}

async function publishToInstagram(
  connection: SocialConnection,
  post: SocialPost,
  pageToken: string
): Promise<{ id: string }> {
  const igUserId = connection.metadata?.instagram_business_account_id as string | undefined;
  if (!igUserId) throw new Error("No Instagram business account configured");

  if (post.media_urls.length === 0) {
    throw new Error("Instagram requires at least one image or video");
  }

  let containerId: string;

  if (post.media_urls.length === 1) {
    // Single media container
    const isVideo = !!post.media_urls[0].match(/\.(mp4|mov)$/i);
    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [isVideo ? "video_url" : "image_url"]: post.media_urls[0],
        caption: post.content,
        media_type: isVideo ? "VIDEO" : "IMAGE",
        access_token: pageToken,
      }),
    });
    if (!res.ok) throw new Error(`Instagram media creation failed: ${await res.text()}`);
    const data = await res.json();
    containerId = data.id;
  } else {
    // Carousel: create each child, then carousel container
    const childIds: string[] = [];
    for (const url of post.media_urls) {
      const isVideo = !!url.match(/\.(mp4|mov)$/i);
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [isVideo ? "video_url" : "image_url"]: url,
          is_carousel_item: true,
          media_type: isVideo ? "VIDEO" : "IMAGE",
          access_token: pageToken,
        }),
      });
      if (!res.ok) throw new Error(`Instagram carousel item creation failed: ${await res.text()}`);
      const data = await res.json();
      childIds.push(data.id);
    }

    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        caption: post.content,
        children: childIds,
        access_token: pageToken,
      }),
    });
    if (!res.ok) throw new Error(`Instagram carousel creation failed: ${await res.text()}`);
    const data = await res.json();
    containerId = data.id;
  }

  // Publish the container
  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: pageToken,
    }),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  return publishRes.json();
}

/**
 * Fetch metrics for a published Facebook or Instagram post.
 */
export async function getMetaPostMetrics(
  connection: SocialConnection,
  platformPostId: string,
  platform: "facebook" | "instagram",
  _supabase: SupabaseClient
): Promise<{ impressions: number; reach: number; likes: number; comments: number; shares: number }> {
  assertConfigured();
  const token = connection.access_token;
  if (!token) throw new Error("No access token");

  if (platform === "instagram") {
    const res = await fetch(
      `${GRAPH_API}/${platformPostId}/insights?metric=impressions,reach,likes,comments&access_token=${token}`
    );
    if (!res.ok) return { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 };
    const data = await res.json();
    const metrics: Record<string, number> = {};
    for (const entry of data.data || []) {
      metrics[entry.name] = entry.values?.[0]?.value || 0;
    }
    return {
      impressions: metrics.impressions || 0,
      reach: metrics.reach || 0,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: 0,
    };
  }

  // Facebook
  const res = await fetch(
    `${GRAPH_API}/${platformPostId}?fields=insights.metric(post_impressions,post_clicks,post_reactions_like_total,post_comments,post_shares)&access_token=${token}`
  );
  if (!res.ok) return { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 };
  const data = await res.json();
  const insights = data.insights?.data || [];
  const byName: Record<string, number> = {};
  for (const insight of insights) {
    byName[insight.name] = insight.values?.[0]?.value || 0;
  }
  return {
    impressions: byName.post_impressions || 0,
    reach: 0,
    likes: byName.post_reactions_like_total || 0,
    comments: byName.post_comments || 0,
    shares: byName.post_shares || 0,
  };
}
