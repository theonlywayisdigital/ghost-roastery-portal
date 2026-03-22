import type { EmailConnection } from "@/types/email";
import type { SupabaseClient } from "@supabase/supabase-js";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

const OUTLOOK_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.Send",
].join(" ");

function assertConfigured() {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth is not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.");
  }
}

/**
 * Build the Microsoft OAuth consent URL for Outlook.
 */
export function getOutlookAuthUrl(roasterId: string, redirectUri: string, nonce: string): string {
  assertConfigured();
  const state = Buffer.from(JSON.stringify({ roasterId, nonce })).toString("base64url");
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OUTLOOK_SCOPES,
    response_mode: "query",
    prompt: "consent",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeOutlookCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  assertConfigured();
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPES,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Outlook token exchange failed: ${err}`);
  }

  return res.json();
}

/**
 * Refresh an expired Outlook access token.
 */
export async function refreshOutlookToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  assertConfigured();
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Outlook token refresh failed: ${err}`);
  }

  return res.json();
}

/**
 * Fetch the authenticated user's email address from Microsoft Graph.
 */
export async function getOutlookUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Outlook user info");
  }

  const data = await res.json();
  return data.mail || data.userPrincipalName;
}

/**
 * Ensure the connection has a fresh access token.
 * Refreshes if token expires within 5 minutes.
 * Microsoft may rotate the refresh token — if a new one is returned, store it.
 */
export async function ensureFreshOutlookToken(
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

  const result = await refreshOutlookToken(connection.refresh_token);

  const updateData: Record<string, unknown> = {
    access_token: result.access_token,
    token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
    last_used_at: new Date().toISOString(),
  };

  // Microsoft may issue a new refresh token
  if (result.refresh_token) {
    updateData.refresh_token = result.refresh_token;
  }

  await supabase
    .from("email_connections")
    .update(updateData)
    .eq("id", connection.id);

  return result.access_token;
}
