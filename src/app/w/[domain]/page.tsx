import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { WebSection } from "@/lib/website-sections/types";
import { WebPageRenderer } from "./_components/WebPageRenderer";

export const dynamic = "force-dynamic";

export default async function WebsiteHomePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const supabase = createServerClient();

  // Look up roaster
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) notFound();

  // Get website
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roaster.id)
    .single();

  if (!website) notFound();

  // Get home page
  const { data: page } = await supabase
    .from("website_pages")
    .select("content")
    .eq("website_id", website.id)
    .eq("slug", "home")
    .eq("is_published", true)
    .single();

  if (!page) notFound();

  const sections: WebSection[] = Array.isArray(page.content)
    ? (page.content as unknown as WebSection[])
    : [];

  return <WebPageRenderer sections={sections} />;
}
