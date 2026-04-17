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
  "/start-trial",
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

  // Platform domains — both old and new for transition period
  const platformDomains = ["roasteryplatform.com", "ghostroastery.com"];
  // Subdomains that are NOT storefront slugs (they serve the portal app itself)
  const reservedSubdomains = ["app", "www", "platform", "portal", "inbox"];

  const isPortalHost = hostname === portalHost || hostname.endsWith(`.${portalHost}`);
  const isDevHost = hostname.includes("localhost") || hostname.includes("vercel.app");

  // Check if hostname is a subdomain of a platform domain (e.g. {slug}.roasteryplatform.com)
  const platformMatch = platformDomains.find(
    (d) => hostname === d || hostname.endsWith(`.${d}`)
  );

  if (platformMatch) {
    // Extract subdomain: "acme.roasteryplatform.com" → "acme"
    const subdomain = hostname === platformMatch
      ? null
      : hostname.slice(0, -(platformMatch.length + 1));

    // If it's a storefront subdomain, rewrite page requests to /s/[slug]/...
    // API routes (/api/...) are NOT rewritten — they serve from the root
    if (subdomain && !reservedSubdomains.includes(subdomain) && !pathname.startsWith("/api/")) {
      const prefix = `/s/${subdomain}`;

      // If the visible URL contains /s/{slug} prefix (e.g. from a server-side
      // redirect or stale link), 301 redirect to the clean path first.
      // Skip embed paths — they're loaded in iframes and need stable URLs.
      if (pathname.startsWith(prefix) && !pathname.startsWith(`${prefix}/embed`)) {
        const cleanPath = pathname.slice(prefix.length) || "/";
        const redirectUrl = new URL(cleanPath, request.url);
        redirectUrl.search = request.nextUrl.search;
        return NextResponse.redirect(redirectUrl, 301);
      }

      // Rewrite the clean path to the internal /s/{slug}/... route
      const rewriteUrl = new URL(`/s/${subdomain}${pathname}`, request.url);
      rewriteUrl.search = request.nextUrl.search;
      return NextResponse.rewrite(rewriteUrl);
    }

    // Redirect /s/[slug]/* on the portal domain to the proper subdomain
    // Skip: localhost/dev, API routes, embed paths (loaded in iframes)
    if (
      !hostname.includes("localhost") &&
      !hostname.includes("127.0.0.1") &&
      pathname.startsWith("/s/")
    ) {
      const segments = pathname.split("/"); // ["", "s", slug, ...rest]
      const slug = segments[2];
      if (slug) {
        const rest = "/" + segments.slice(3).join("/"); // e.g. "/wholesale" or "/"
        const isEmbed = rest.startsWith("/embed");

        if (!isEmbed) {
          const redirectUrl = new URL(
            `https://${slug}.${platformMatch}${rest === "/" ? "" : rest}`
          );
          redirectUrl.search = request.nextUrl.search;
          return NextResponse.redirect(redirectUrl, 301);
        }
      }
    }

    // Otherwise it's the portal app itself (app., www., bare domain) — fall through
  } else if (!isPortalHost && !isDevHost) {
    // Custom domain rewriting — hostname is not a platform domain,
    // treat it as a custom website domain and rewrite to /w/[hostname]/[path]
    const rewriteUrl = new URL(`/w/${hostname}${pathname}`, request.url);
    rewriteUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(rewriteUrl);
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Set pathname header for server components (used by portal layout lockout check)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Create Supabase client that can refresh the session via cookies
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
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
