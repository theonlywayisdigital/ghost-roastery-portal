import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { BlogEditorClient } from "./BlogEditorClient";

export default async function BlogPostEditorRoute({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  // Tier gate — must have marketing tier
  const marketingTier = (user.roaster as Record<string, unknown>).marketing_tier as string | undefined;
  if (!marketingTier) {
    redirect("/marketing/blog");
  }

  // Handle "new" post creation
  if (postId === "new") {
    const supabase = createServerClient();
    const { data: newPost } = await supabase
      .from("blog_posts")
      .insert({
        roaster_id: user.roaster.id,
        title: "Untitled Post",
        slug: `post-${Date.now()}`,
        content: [],
      })
      .select("id")
      .single();

    if (newPost) {
      redirect(`/marketing/blog/${newPost.id}`);
    }
    redirect("/marketing/blog");
  }

  const supabase = createServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", postId)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!post) redirect("/marketing/blog");

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/marketing/blog"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      <BlogEditorClient
        postId={post.id}
        initialTitle={post.title}
        initialSlug={post.slug}
        initialExcerpt={post.excerpt || ""}
        initialBlocks={post.content || []}
        isPublished={post.is_published}
        publishedAt={post.published_at}
        roasterId={user.roaster.id}
        initialFeaturedImageUrl={post.featured_image_url || ""}
        initialAuthorName={post.author_name || ""}
        initialSeoTitle={post.seo_title || ""}
        initialSeoDescription={post.seo_description || ""}
      />
    </div>
  );
}
