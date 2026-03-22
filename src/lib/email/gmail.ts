import type { EmailConnection } from "@/types/email";
import type { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function assertConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }
}

/**
 * Build the Gmail OAuth consent URL.
 * Uses the same Google OAuth client as social/google but requests Gmail-specific scopes.
 */
export function getGmailAuthUrl(roasterId: string, redirectUri: string, nonce: string): string {
  assertConfigured();
  const state = Buffer.from(JSON.stringify({ roasterId, nonce })).toString("base64url");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeGmailCode(
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
    throw new Error(`Gmail token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Refresh an expired Gmail access token.
 */
export async function refreshGmailToken(
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
    throw new Error(`Gmail token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Fetch the authenticated user's email address from Google userinfo.
 */
export async function getGmailUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Gmail user info");
  }

  const data = await res.json();
  return data.email;
}

/**
 * Ensure the connection has a fresh access token.
 * Refreshes if token expires within 5 minutes.
 */
export async function ensureFreshGmailToken(
  connection: EmailConnection,
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

  const { access_token, expires_in } = await refreshGmailToken(connection.refresh_token);

  await supabase
    .from("email_connections")
    .update({
      access_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return access_token;
}
