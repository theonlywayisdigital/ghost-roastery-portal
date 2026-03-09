import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { WebPageRenderer } from "../../_components/WebPageRenderer";
import Link from "next/link";

interface PageProps {
  params: Promise<{ domain: string; postSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain, postSlug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id, business_name")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) return { title: "Not Found" };

  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, seo_title, seo_description, featured_image_url, author_name, published_at")
    .eq("roaster_id", roaster.id)
    .eq("slug", postSlug)
    .eq("is_published", true)
    .single();

  if (!post) return { title: "Not Found" };

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: roaster.business_name,
      type: "article",
      ...(post.featured_image_url && {
        images: [{ url: post.featured_image_url }],
      }),
      ...(post.published_at && {
        publishedTime: post.published_at,
      }),
      ...(post.author_name && {
        authors: [post.author_name],
      }),
    },
  };
}

export default async function WebsiteBlogPostPage({ params }: PageProps) {
  const { domain, postSlug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("roaster_id", roaster.id)
    .eq("slug", postSlug)
    .eq("is_published", true)
    .single();

  if (!post) notFound();

  const basePath = `/w/${domain}`;

  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <Link href={`${basePath}/blog`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none", marginBottom: 24, display: "inline-block" }}>
        &larr; Back to Blog
      </Link>

      {post.featured_image_url && (
        <div style={{ marginBottom: 32, borderRadius: 12, overflow: "hidden" }}>
          <img
            src={post.featured_image_url}
            alt={post.title}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}

      <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 12, fontFamily: "var(--font-heading)" }}>
        {post.title}
      </h1>

      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 40 }}>
        {post.published_at
          ? new Date(post.published_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : ""}
        {post.author_name ? ` · ${post.author_name}` : ""}
      </p>

      <WebPageRenderer sections={Array.isArray(post.content) ? (post.content as unknown as import("@/lib/website-sections/types").WebSection[]) : []} />
    </article>
  );
}
