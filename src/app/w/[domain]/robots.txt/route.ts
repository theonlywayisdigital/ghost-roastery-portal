import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const supabase = createServerClient();

  // Look up roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id, website_custom_domain, storefront_slug")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return new NextResponse("User-agent: *\nDisallow: /", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Determine the base URL for sitemap reference
  const customDomain = roaster.website_custom_domain;
  const baseUrl = customDomain
    ? `https://${customDomain}`
    : `${process.env.NEXT_PUBLIC_BASE_URL || "https://portal.ghostroasting.co.uk"}/w/${roaster.storefront_slug}`;

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
