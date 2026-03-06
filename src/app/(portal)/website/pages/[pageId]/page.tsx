import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { defaultTheme } from "@/lib/website-sections/types";
import type { WebSection, WebsiteTheme } from "@/lib/website-sections/types";
import { PageEditorClient } from "./PageEditorClient";

export default async function WebsitePageEditorRoute({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();

  // Get or create the website for this roaster
  let { data: website } = await supabase
    .from("websites")
    .select("id, roaster_id, name, design_settings")
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!website) {
    // Auto-create website record if it doesn't exist
    const { data: newWebsite } = await supabase
      .from("websites")
      .insert({
        roaster_id: user.roaster.id,
        name: user.roaster.business_name || "My Website",
        subdomain: user.roaster.storefront_slug || undefined,
      })
      .select("id, roaster_id, name, design_settings")
      .single();
    website = newWebsite;
  }

  if (!website) redirect("/website/pages");

  // Handle "new" page creation
  if (pageId === "new") {
    const { data: newPage } = await supabase
      .from("website_pages")
      .insert({
        website_id: website.id,
        title: "New Page",
        slug: `page-${Date.now()}`,
        content: [],
      })
      .select("id")
      .single();

    if (newPage) {
      redirect(`/website/pages/${newPage.id}`);
    }
    redirect("/website/pages");
  }

  // Fetch the page — verify it belongs to this roaster's website
  const { data: page } = await supabase
    .from("website_pages")
    .select("*")
    .eq("id", pageId)
    .eq("website_id", website.id)
    .single();

  if (!page) redirect("/website/pages");

  // Build theme from design_settings
  const ds = website.design_settings as Record<string, unknown> | null;
  const theme: WebsiteTheme = ds
    ? {
        primaryColor: (ds.primaryColor as string) ?? defaultTheme.primaryColor,
        accentColor: (ds.accentColor as string) ?? defaultTheme.accentColor,
        backgroundColor: (ds.backgroundColor as string) ?? defaultTheme.backgroundColor,
        textColor: (ds.textColor as string) ?? defaultTheme.textColor,
        headingFont: (ds.headingFont as string) ?? defaultTheme.headingFont,
        bodyFont: (ds.bodyFont as string) ?? defaultTheme.bodyFont,
        logoUrl: ds.logoUrl as string | undefined,
        borderRadius: (ds.borderRadius as WebsiteTheme["borderRadius"]) ?? defaultTheme.borderRadius,
        navLayout: (ds.navLayout as WebsiteTheme["navLayout"]) ?? defaultTheme.navLayout,
        navBgColor: (ds.navBgColor as string) ?? defaultTheme.navBgColor,
        navTextColor: (ds.navTextColor as string) ?? defaultTheme.navTextColor,
        navTextSize: (ds.navTextSize as WebsiteTheme["navTextSize"]) ?? defaultTheme.navTextSize,
        navLogoSize: (ds.navLogoSize as WebsiteTheme["navLogoSize"]) ?? defaultTheme.navLogoSize,
        navTextHoverColor: (ds.navTextHoverColor as string) ?? defaultTheme.navTextHoverColor,
        navButtonBgColor: (ds.navButtonBgColor as string) ?? defaultTheme.navButtonBgColor,
        navButtonTextColor: (ds.navButtonTextColor as string) ?? defaultTheme.navButtonTextColor,
        navButtonBorderColor: (ds.navButtonBorderColor as string) ?? defaultTheme.navButtonBorderColor,
        navButtonHoverBgColor: (ds.navButtonHoverBgColor as string) ?? defaultTheme.navButtonHoverBgColor,
        navButtonHoverTextColor: (ds.navButtonHoverTextColor as string) ?? defaultTheme.navButtonHoverTextColor,
        navButtonHoverBorderColor: (ds.navButtonHoverBorderColor as string) ?? defaultTheme.navButtonHoverBorderColor,
      }
    : defaultTheme;

  const sections: WebSection[] = Array.isArray(page.content)
    ? (page.content as unknown as WebSection[])
    : [];

  // Fetch nav pages for preview (published + show_in_nav only)
  const { data: navPagesData } = await supabase
    .from("website_pages")
    .select("title, slug, is_nav_button")
    .eq("website_id", website.id)
    .eq("is_published", true)
    .eq("show_in_nav", true)
    .order("nav_sort_order");

  const navPages = (navPagesData ?? []).map((p) => ({
    title: p.title,
    slug: p.slug,
    is_nav_button: p.is_nav_button,
  }));

  // Fetch ALL pages for the page dropdown
  const { data: allPagesData } = await supabase
    .from("website_pages")
    .select("id, title, slug, is_published")
    .eq("website_id", website.id)
    .order("sort_order");

  const allPages = (allPagesData ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    is_published: p.is_published,
  }));

  const siteName = website.name || user.roaster.business_name || "My Coffee";
  const logoUrl = theme.logoUrl || (user.roaster as Record<string, unknown>).brand_logo_url as string | undefined;
  const previewDomain = (user.roaster as Record<string, unknown>).storefront_slug as string | undefined;

  return (
    <PageEditorClient
      pageId={page.id}
      pageTitle={page.title}
      pageSlug={page.slug}
      initialSections={sections}
      isPublished={page.is_published}
      theme={theme}
      roasterId={user.roaster.id}
      siteName={siteName}
      logoUrl={logoUrl}
      navPages={navPages}
      allPages={allPages}
      previewDomain={previewDomain}
      metaTitle={page.meta_title ?? ""}
      metaDescription={page.meta_description ?? ""}
    />
  );
}
