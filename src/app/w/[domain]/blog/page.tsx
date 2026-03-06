import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";

export default async function WebsiteBlogIndexPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id, business_name")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, featured_image_url, published_at, author_name")
    .eq("roaster_id", roaster.id)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const basePath = `/w/${domain}`;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-heading)" }}>Blog</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 40 }}>
        {`Latest news and stories from ${roaster.business_name}`}
      </p>

      {!posts || posts.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>No blog posts yet. Check back soon!</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`${basePath}/blog/${post.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                {post.featured_image_url && (
                  <div style={{ height: 180, overflow: "hidden" }}>
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
                <div style={{ padding: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px", fontFamily: "var(--font-heading)" }}>
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
                      {post.excerpt}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                    {post.author_name ? ` · ${post.author_name}` : ""}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
