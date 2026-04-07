import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff, Lock, Sparkles } from "@/components/icons";

export default async function BlogPostsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const marketingTier = (user.roaster as Record<string, unknown>).marketing_tier as string | undefined;
  const isFree = !marketingTier;

  if (isFree) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
          <p className="text-slate-500 text-sm mt-1">
            Write and publish blog posts for your website.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Blog requires a paid Marketing plan</h2>
          <p className="text-sm text-slate-500 mb-6">
            Upgrade your Marketing plan to create and publish blog posts on your website.
          </p>
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createServerClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, is_published, published_at, created_at, updated_at")
    .eq("roaster_id", user.roaster.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
          <p className="text-slate-500 text-sm mt-1">
            Write and publish blog posts for your website.
          </p>
        </div>
        <Link
          href="/marketing/blog/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No blog posts yet. Write your first post to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/marketing/blog/${post.id}`}
              className="block bg-white rounded-xl border border-slate-200 px-6 py-4 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-4">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{post.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">/{post.slug}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {post.is_published ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-xs font-medium text-green-700">
                      <Eye className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-xs font-medium text-slate-400">
                      <EyeOff className="w-3 h-3" /> Draft
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : post.created_at
                        ? new Date(post.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
