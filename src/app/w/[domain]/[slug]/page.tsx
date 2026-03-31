import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import type { WebSection } from "@/lib/website-sections/types";
import { WebPageRenderer } from "../_components/WebPageRenderer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ domain: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain, slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select("id, business_name")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) return { title: "Not Found" };

  const { data: website } = await supabase
    .from("websites")
    .select("id, name")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) return { title: "Not Found" };

  const { data: page } = await supabase
    .from("website_pages")
    .select("title, meta_title, meta_description")
    .eq("website_id", website.id)
    .eq("slug", slug)
    .single();

  const siteName = website.name || roaster.business_name;
  const title = page?.meta_title || page?.title || "Page";
  const description = page?.meta_description ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
    },
  };
}

export default async function WebsitePage({ params }: PageProps) {
  const { domain, slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) notFound();

  const { data: page } = await supabase
    .from("website_pages")
    .select("title, content, meta_description")
    .eq("website_id", website.id)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!page) notFound();

  const sections: WebSection[] = Array.isArray(page.content)
    ? (page.content as unknown as WebSection[])
    : [];

  // Fetch products if any product sections exist
  const hasProductSection = sections.some(
    (s) => s.type === "featured_products" || s.type === "all_products"
  );

  let products;
  if (hasProductSection) {
    const { data: dbProducts } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, sort_order")
      .eq("roaster_id", roaster.id)
      .eq("is_active", true)
      .eq("is_retail", true)
      .order("sort_order", { ascending: true });

    products = (dbProducts ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image_url ?? undefined,
      description: p.description ?? undefined,
    }));
  }

  return <WebPageRenderer sections={sections} products={products} domain={domain} basePath={`/w/${domain}`} />;
}
