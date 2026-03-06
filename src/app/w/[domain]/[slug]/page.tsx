import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { WebSection } from "@/lib/website-sections/types";
import { WebPageRenderer } from "../_components/WebPageRenderer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ domain: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { domain, slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) return { title: "Not Found" };

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) return { title: "Not Found" };

  const { data: page } = await supabase
    .from("website_pages")
    .select("title, meta_title, meta_description")
    .eq("website_id", website.id)
    .eq("slug", slug)
    .single();

  return {
    title: page?.meta_title || page?.title || "Page",
    description: page?.meta_description ?? undefined,
  };
}

export default async function WebsitePage({ params }: PageProps) {
  const { domain, slug } = await params;
  const supabase = createServerClient();

  const { data: roaster } = await supabase
    .from("partner_roasters")
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

  return <WebPageRenderer sections={sections} />;
}
