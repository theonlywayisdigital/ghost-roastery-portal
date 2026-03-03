import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { StorefrontProvider } from "./_components/StorefrontProvider";
import { CartProvider } from "./_components/CartProvider";
import { isLightColour } from "./_components/utils";
import { resolveFontFamily, buildGoogleFontsUrl } from "@/lib/fonts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      "business_name, brand_tagline, storefront_seo_title, storefront_seo_description, storefront_enabled"
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) return { title: "Not Found" };

  return {
    title: roaster.storefront_seo_title || roaster.business_name,
    description:
      roaster.storefront_seo_description ||
      roaster.brand_tagline ||
      `${roaster.business_name} — Specialty coffee`,
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select(
      `id, business_name, brand_logo_url, brand_primary_colour, brand_accent_colour,
       brand_heading_font, brand_body_font, brand_tagline, brand_hero_image_url, brand_about,
       brand_instagram, brand_facebook, brand_tiktok, storefront_type,
       minimum_wholesale_order, storefront_enabled, retail_enabled,
       stripe_account_id`
    )
    .eq("storefront_slug", slug)
    .eq("storefront_enabled", true)
    .single();

  if (!roaster) notFound();

  const headingFamily = resolveFontFamily(roaster.brand_heading_font);
  const bodyFamily = resolveFontFamily(roaster.brand_body_font);
  const fontsToLoad = Array.from(new Set([headingFamily, bodyFamily]));
  const googleFontsUrl = buildGoogleFontsUrl(fontsToLoad);

  const primary = roaster.brand_primary_colour || "#1e293b";
  const accent = roaster.brand_accent_colour || "#0083dc";
  const accentText = isLightColour(accent) ? "#1e293b" : "#ffffff";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {googleFontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={googleFontsUrl} />
      )}
      <div
        style={
          {
            "--sf-font": `"${headingFamily}", sans-serif`,
            "--sf-font-body": `"${bodyFamily}", sans-serif`,
            "--sf-primary": primary,
            "--sf-accent": accent,
            "--sf-accent-text": accentText,
          } as React.CSSProperties
        }
      >
        <StorefrontProvider roaster={roaster} slug={slug}>
          <CartProvider slug={slug} roasterId={roaster.id}>
            {children}
          </CartProvider>
        </StorefrontProvider>
      </div>
    </>
  );
}
