import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/verify-email",
  "/mfa-challenge",
  "/setup-password",
  "/auth",
  "/s",
  "/w",
  "/api/s",
  "/api/w",
  "/api/auth",
  "/api/social/meta/callback",
  "/api/integrations/shopify/callback",
  "/api/integrations/xero/callback",
  "/api/integrations/sage/callback",
  "/api/integrations/quickbooks/callback",
  "/api/integrations/wix/callback",
  "/api/webhooks",
  "/api/cron",
  "/api/marketing/campaigns/process",
  "/api/marketing/automations/process",
  "/api/social/process",
  "/api/social/analytics",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const portalHost = process.env.NEXT_PUBLIC_PORTAL_HOST || "localhost:3001";
  const platformDomain = "roasteryplatform.com";

  // Check if hostname is the portal itself or a known platform domain
  const isPortalHost = hostname === portalHost || hostname.endsWith(`.${portalHost}`);
  const isPlatformDomain = hostname === platformDomain || hostname.endsWith(`.${platformDomain}`);
  const isDevHost = hostname.includes("localhost") || hostname.includes("vercel.app");

  // Custom domain rewriting — if the hostname is not the portal host
  // and not a platform domain, treat it as a custom website domain
  // and rewrite to /w/[hostname]/[path]
  if (!isPortalHost && !isPlatformDomain && !isDevHost) {
    const rewriteUrl = new URL(`/w/${hostname}${pathname}`, request.url);
    rewriteUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(rewriteUrl);
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Create Supabase client that can refresh the session via cookies
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — this is critical for keeping the session alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check MFA: if user has TOTP factors but session is aal1, redirect to MFA challenge
  // Only redirect page navigations — API routes get a 401 JSON response instead
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    mfaData &&
    mfaData.nextLevel === "aal2" &&
    mfaData.currentLevel === "aal1"
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "MFA verification required" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/mfa-challenge", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
