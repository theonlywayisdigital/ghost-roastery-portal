import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { defaultTheme } from "@/lib/website-sections/types";
import type { WebsiteTheme } from "@/lib/website-sections/types";
import { WebsiteNav } from "./_components/WebsiteNav";
import { WebsiteFooter } from "./_components/WebsiteFooter";
import { WebsiteThemeProvider } from "@/app/(portal)/website/section-editor/WebsiteThemeProvider";

export const dynamic = "force-dynamic";

interface WebsiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

async function getWebsite(domain: string) {
  const supabase = createServerClient();

  // Look up roaster by custom domain or storefront slug
  const { data: roaster } = await supabase
    .from("roasters")
    .select("id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_instagram, brand_facebook, brand_tiktok, website_custom_domain, storefront_slug")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) return null;

  // Get website record
  const { data: website } = await supabase
    .from("websites")
    .select("id, name, design_settings, footer_text, is_published")
    .eq("roaster_id", roaster.id)
    .single();

  return { roaster, website };
}

export default async function WebsiteLayout({ children, params }: WebsiteLayoutProps) {
  const { domain } = await params;
  const result = await getWebsite(domain);

  if (!result || !result.roaster) notFound();

  const { roaster, website } = result;
  const supabase = createServerClient();

  // Build theme from roaster brand settings + website design_settings
  const ds = website?.design_settings as Record<string, unknown> | null;
  const theme: WebsiteTheme = {
    primaryColor: (ds?.primaryColor as string) ?? roaster.brand_primary_colour ?? defaultTheme.primaryColor,
    accentColor: (ds?.accentColor as string) ?? roaster.brand_accent_colour ?? defaultTheme.accentColor,
    backgroundColor: (ds?.backgroundColor as string) ?? defaultTheme.backgroundColor,
    textColor: (ds?.textColor as string) ?? defaultTheme.textColor,
    headingFont: (ds?.headingFont as string) ?? roaster.brand_heading_font ?? defaultTheme.headingFont,
    bodyFont: (ds?.bodyFont as string) ?? roaster.brand_body_font ?? defaultTheme.bodyFont,
    logoUrl: (ds?.logoUrl as string) ?? roaster.brand_logo_url ?? undefined,
    borderRadius: (ds?.borderRadius as WebsiteTheme["borderRadius"]) ?? defaultTheme.borderRadius,
    navLayout: (ds?.navLayout as WebsiteTheme["navLayout"]) ?? defaultTheme.navLayout,
    navBgColor: (ds?.navBgColor as string) ?? defaultTheme.navBgColor,
    navTextColor: (ds?.navTextColor as string) ?? defaultTheme.navTextColor,
    navTextSize: (ds?.navTextSize as WebsiteTheme["navTextSize"]) ?? defaultTheme.navTextSize,
    navLogoSize: (ds?.navLogoSize as WebsiteTheme["navLogoSize"]) ?? defaultTheme.navLogoSize,
    navTextHoverColor: (ds?.navTextHoverColor as string) ?? defaultTheme.navTextHoverColor,
    navButtonBgColor: (ds?.navButtonBgColor as string) ?? defaultTheme.navButtonBgColor,
    navButtonTextColor: (ds?.navButtonTextColor as string) ?? defaultTheme.navButtonTextColor,
    navButtonBorderColor: (ds?.navButtonBorderColor as string) ?? defaultTheme.navButtonBorderColor,
    navButtonHoverBgColor: (ds?.navButtonHoverBgColor as string) ?? defaultTheme.navButtonHoverBgColor,
    navButtonHoverTextColor: (ds?.navButtonHoverTextColor as string) ?? defaultTheme.navButtonHoverTextColor,
    navButtonHoverBorderColor: (ds?.navButtonHoverBorderColor as string) ?? defaultTheme.navButtonHoverBorderColor,
  };

  // Fetch published pages for nav (show_in_nav) and footer (show_in_footer) separately
  const { data: navPagesData } = website
    ? await supabase
        .from("website_pages")
        .select("title, slug, is_nav_button")
        .eq("website_id", website.id)
        .eq("is_published", true)
        .eq("show_in_nav", true)
        .order("nav_sort_order")
    : { data: null };

  const { data: footerPagesData } = website
    ? await supabase
        .from("website_pages")
        .select("title, slug")
        .eq("website_id", website.id)
        .eq("is_published", true)
        .eq("show_in_footer", true)
        .order("footer_sort_order")
    : { data: null };

  const navPages = (navPagesData ?? []).map((p) => ({
    title: p.title,
    slug: p.slug,
    is_nav_button: p.is_nav_button,
  }));

  const footerPages = (footerPagesData ?? []).map((p) => ({
    title: p.title,
    slug: p.slug,
  }));

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.headingFont)}:wght@400;600;700&family=${encodeURIComponent(theme.bodyFont)}:wght@400;500;600&display=swap`}
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          fontFamily: `'${theme.bodyFont}', sans-serif`,
        }}
      >
        <WebsiteThemeProvider theme={theme}>
          <WebsiteNav
            siteName={website?.name ?? roaster.business_name}
            logoUrl={theme.logoUrl}
            pages={navPages}
            theme={theme}
            basePath={`/w/${domain}`}
          />
          <main>{children}</main>
          <WebsiteFooter
            siteName={website?.name ?? roaster.business_name}
            theme={theme}
            pages={footerPages}
            basePath={`/w/${domain}`}
            footerText={website?.footer_text ?? undefined}
          />
        </WebsiteThemeProvider>
      </body>
    </html>
  );
}
