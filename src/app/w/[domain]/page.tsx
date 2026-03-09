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

  // Fetch products if any product sections exist
  const hasProductSection = sections.some(
    (s) => s.type === "featured_products" || s.type === "all_products"
  );

  let products;
  if (hasProductSection) {
    const { data: dbProducts } = await supabase
      .from("wholesale_products")
      .select("id, name, description, price, image_url, sort_order")
      .eq("roaster_id", roaster.id)
      .eq("is_active", true)
      .in("product_type", ["retail", "both"])
      .order("sort_order", { ascending: true });

    products = (dbProducts ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image_url ?? undefined,
      description: p.description ?? undefined,
    }));
  }

  return <WebPageRenderer sections={sections} products={products} />;
}
