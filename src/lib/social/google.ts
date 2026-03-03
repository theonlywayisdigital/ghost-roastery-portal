import type { SocialConnection, SocialPost } from "@/types/social";
import type { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

function assertConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }
}

/**
 * Build the Google OAuth consent URL.
 * Encodes roasterId + nonce in the state parameter for callback verification.
 */
export function getGoogleAuthUrl(roasterId: string, redirectUri: string, nonce: string): string {
  assertConfigured();
  const state = Buffer.from(JSON.stringify({ roasterId, nonce })).toString("base64url");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  assertConfigured();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  assertConfigured();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Get Google Business accounts for the authenticated user.
 */
export async function getGoogleAccounts(
  accessToken: string
): Promise<{ accounts: Array<{ name: string; accountName: string; type: string }> }> {
  const res = await fetch(GOOGLE_ACCOUNTS_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch Google accounts: ${err}`);
  }

  return res.json();
}

/**
 * Get locations for a Google Business account.
 */
export async function getGoogleLocations(
  accessToken: string,
  accountId: string
): Promise<{ locations: Array<{ name: string; title: string; storefrontAddress?: unknown }> }> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch Google locations: ${err}`);
  }

  return res.json();
}

/**
 * Ensure the connection has a fresh access token.
 * Refreshes if token expires within 5 minutes.
 * Updates DB with new token if refreshed.
 */
export async function ensureFreshToken(
  connection: SocialConnection,
  supabase: SupabaseClient
): Promise<string> {
  if (!connection.access_token) {
    throw new Error("No access token available");
  }

  if (!connection.token_expires_at || !connection.refresh_token) {
    return connection.access_token;
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const fiveMinFromNow = Date.now() + 5 * 60 * 1000;

  if (expiresAt > fiveMinFromNow) {
    return connection.access_token;
  }

  // Token is expired or about to expire — refresh
  const { access_token, expires_in } = await refreshGoogleToken(connection.refresh_token);

  // Update DB with new token — plaintext for now
  // TODO: encrypt tokens for production
  await supabase
    .from("social_connections")
    .update({
      access_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return access_token;
}

/**
 * Publish a post to Google Business Profile.
 */
export async function publishToGoogle(
  connection: SocialConnection,
  post: SocialPost,
  supabase: SupabaseClient
): Promise<{ name: string }> {
  const accessToken = await ensureFreshToken(connection, supabase);
  const locationName = connection.platform_page_id;

  if (!locationName) {
    throw new Error("No Google Business location configured");
  }

  const googleConfig = post.platforms.google_business;

  // Build the localPost body
  const localPost: Record<string, unknown> = {
    languageCode: "en",
    summary: post.content,
    topicType: "STANDARD",
  };

  // Add media if present
  if (post.media_urls.length > 0) {
    localPost.media = post.media_urls.map((url) => ({
      mediaFormat: url.match(/\.(mp4|mov)$/i) ? "VIDEO" : "PHOTO",
      sourceUrl: url,
    }));
  }

  // Add CTA if configured
  if (googleConfig?.cta_type && googleConfig?.cta_url) {
    localPost.callToAction = {
      actionType: googleConfig.cta_type,
      url: googleConfig.cta_url,
    };
  }

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(localPost),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to publish to Google: ${err}`);
  }

  // Update last_used_at
  await supabase
    .from("social_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", connection.id);

  return res.json();
}

/**
 * Fetch metrics for a published Google Business post.
 */
export async function getGooglePostMetrics(
  connection: SocialConnection,
  platformPostId: string,
  supabase: SupabaseClient
): Promise<{ impressions: number; clicks: number; views: number }> {
  const accessToken = await ensureFreshToken(connection, supabase);

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${platformPostId}?view=FULL`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Google post metrics");
  }

  const data = await res.json();
  const metrics = data.searchUrl ? data : {};

  return {
    impressions: metrics.searchInsightsData?.queryCount || 0,
    clicks: metrics.callToAction?.clickCount || 0,
    views: metrics.viewCount || 0,
  };
}
