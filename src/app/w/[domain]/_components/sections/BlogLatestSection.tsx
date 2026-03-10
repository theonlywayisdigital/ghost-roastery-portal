"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { BlogLatestSectionData, WebsiteTheme } from "@/lib/website-sections/types";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  author_name: string | null;
}

interface BlogLatestSectionProps {
  data: BlogLatestSectionData;
  theme: WebsiteTheme;
  isEditor?: boolean;
  domain?: string;
  basePath?: string;
}

const ease = [0.21, 0.47, 0.32, 0.98] as const;

export function BlogLatestSection({ data, theme, isEditor, domain, basePath }: BlogLatestSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(!isEditor && !!domain);

  useEffect(() => {
    if (isEditor || !domain) return;
    setLoading(true);
    fetch(`/api/w/${domain}/blog?limit=${data.maxPosts}`)
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [domain, data.maxPosts, isEditor]);

  const Container = isEditor ? "div" : motion.section;
  const containerProps = isEditor ? {} : {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease },
  };

  const showSkeletons = isEditor || loading;

  return (
    <Container {...containerProps} className="py-16 md:py-24" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4"
            style={{ color: theme.textColor, fontFamily: theme.headingFont }}
          >
            {data.heading}
          </h2>
          {data.subheading && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-70" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
              {data.subheading}
            </p>
          )}
        </div>

        {showSkeletons ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: data.maxPosts }, (_, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: `${theme.textColor}06` }}>
                <div className="aspect-[16/9]" style={{ backgroundColor: `${theme.primaryColor}10` }} />
                <div className="p-5">
                  <div className="h-3 rounded w-1/4 mb-3" style={{ backgroundColor: `${theme.primaryColor}20` }} />
                  <div className="h-5 rounded w-3/4 mb-2" style={{ backgroundColor: `${theme.textColor}15` }} />
                  <div className="h-4 rounded w-full mb-1" style={{ backgroundColor: `${theme.textColor}08` }} />
                  <div className="h-4 rounded w-2/3" style={{ backgroundColor: `${theme.textColor}08` }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center opacity-50" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
            No blog posts yet. Check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`${basePath || ""}/blog/${post.slug}`}
                className="group rounded-xl overflow-hidden no-underline"
                style={{ backgroundColor: `${theme.textColor}06`, color: "inherit" }}
              >
                {post.featured_image_url ? (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9]" style={{ backgroundColor: `${theme.primaryColor}10` }} />
                )}
                <div className="p-5">
                  {post.published_at && (
                    <p className="text-xs mb-2 opacity-50" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                      {new Date(post.published_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <h3
                    className="text-lg font-bold mb-2 leading-snug"
                    style={{ color: theme.textColor, fontFamily: theme.headingFont }}
                  >
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm opacity-60 leading-relaxed line-clamp-2" style={{ color: theme.textColor, fontFamily: theme.bodyFont }}>
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
