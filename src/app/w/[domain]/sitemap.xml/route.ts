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
    .from("roasters")
    .select("id, website_custom_domain, storefront_slug")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Determine the base URL for this site
  const customDomain = roaster.website_custom_domain;
  const baseUrl = customDomain
    ? `https://${customDomain}`
    : `${process.env.NEXT_PUBLIC_BASE_URL || "https://app.roasteryplatform.com"}/w/${roaster.storefront_slug}`;

  // Get website
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Get published pages
  const { data: pages } = await supabase
    .from("website_pages")
    .select("slug, updated_at")
    .eq("website_id", website.id)
    .eq("is_published", true)
    .order("slug");

  // Get published blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("roaster_id", roaster.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  // Build sitemap XML
  const urls: string[] = [];

  // Pages
  for (const page of pages ?? []) {
    const path = page.slug === "home" ? "" : `/${page.slug}`;
    const lastmod = page.updated_at
      ? new Date(page.updated_at).toISOString().split("T")[0]
      : undefined;
    urls.push(
      `  <url>\n    <loc>${baseUrl}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>${page.slug === "home" ? "weekly" : "monthly"}</changefreq>\n    <priority>${page.slug === "home" ? "1.0" : "0.8"}</priority>\n  </url>`
    );
  }

  // Blog index
  if (posts && posts.length > 0) {
    urls.push(
      `  <url>\n    <loc>${baseUrl}/blog</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );
  }

  // Blog posts
  for (const post of posts ?? []) {
    const lastmod = (post.updated_at || post.published_at)
      ? new Date(post.updated_at || post.published_at).toISOString().split("T")[0]
      : undefined;
    urls.push(
      `  <url>\n    <loc>${baseUrl}/blog/${post.slug}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
