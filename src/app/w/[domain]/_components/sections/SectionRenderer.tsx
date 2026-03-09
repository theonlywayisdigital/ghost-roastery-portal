"use client";

import { defaultTheme } from "@/lib/website-sections/types";
import type { WebSection, WebsiteTheme, SectionBg } from "@/lib/website-sections/types";
import { HeroSection } from "./HeroSection";
import { HeroSplitSection } from "./HeroSplitSection";
import { FeaturedProductsSection, type ProductData } from "./FeaturedProductsSection";
import { AllProductsSection } from "./AllProductsSection";
import { AboutSection } from "./AboutSection";
import { AboutTeamSection } from "./AboutTeamSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { TextContentSection } from "./TextContentSection";
import { ImageGallerySection } from "./ImageGallerySection";
import { CtaBannerSection } from "./CtaBannerSection";
import { FaqSection } from "./FaqSection";
import { ContactFormSection } from "./ContactFormSection";
import { NewsletterSection } from "./NewsletterSection";
import { InstagramFeedSection } from "./InstagramFeedSection";
import { BlogLatestSection } from "./BlogLatestSection";
import { WholesaleInfoSection } from "./WholesaleInfoSection";
import { CustomHtmlSection } from "./CustomHtmlSection";
import { LogoBarSection } from "./LogoBarSection";
import { PricingTableSection } from "./PricingTableSection";
import { StatsCounterSection } from "./StatsCounterSection";
import { VideoHeroSection } from "./VideoHeroSection";
import { EventsSection } from "./EventsSection";
import { LocationSection } from "./LocationSection";

interface SectionRendererProps {
  section: WebSection;
  theme?: WebsiteTheme;
  isEditor?: boolean;
  products?: ProductData[];
}

function buildBgStyles(bg: SectionBg): React.CSSProperties {
  switch (bg.type) {
    case "solid":
      return { backgroundColor: bg.color ?? "#ffffff" };
    case "gradient":
      return {
        backgroundImage: `linear-gradient(${bg.gradientAngle ?? 135}deg, ${bg.gradientFrom ?? "#ffffff"}, ${bg.gradientTo ?? "#000000"})`,
      };
    case "image":
      return {
        backgroundImage: bg.imageUrl ? `url(${bg.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      };
    default:
      return {};
  }
}

export function SectionRenderer({ section, theme: themeProp, isEditor, products }: SectionRendererProps) {
  const theme = themeProp ?? defaultTheme;
  if (!section.visible && !isEditor) return null;

  const style = !section.visible && isEditor ? { opacity: 0.4 } : undefined;

  const rendered = (() => {
    switch (section.type) {
      case "hero":
        return <HeroSection data={section} theme={theme} isEditor={isEditor} />;
      case "hero_split":
        return <HeroSplitSection data={section} theme={theme} isEditor={isEditor} />;
      case "featured_products":
        return <FeaturedProductsSection data={section} theme={theme} isEditor={isEditor} products={products} />;
      case "all_products":
        return <AllProductsSection data={section} theme={theme} isEditor={isEditor} products={products} />;
      case "about":
        return <AboutSection data={section} theme={theme} isEditor={isEditor} />;
      case "about_team":
        return <AboutTeamSection data={section} theme={theme} isEditor={isEditor} />;
      case "testimonials":
        return <TestimonialsSection data={section} theme={theme} isEditor={isEditor} />;
      case "text_content":
        return <TextContentSection data={section} theme={theme} isEditor={isEditor} />;
      case "image_gallery":
        return <ImageGallerySection data={section} theme={theme} isEditor={isEditor} />;
      case "cta_banner":
        return <CtaBannerSection data={section} theme={theme} isEditor={isEditor} />;
      case "faq":
        return <FaqSection data={section} theme={theme} isEditor={isEditor} />;
      case "contact_form":
        return <ContactFormSection data={section} theme={theme} isEditor={isEditor} />;
      case "newsletter":
        return <NewsletterSection data={section} theme={theme} isEditor={isEditor} />;
      case "instagram_feed":
        return <InstagramFeedSection data={section} theme={theme} isEditor={isEditor} />;
      case "blog_latest":
        return <BlogLatestSection data={section} theme={theme} isEditor={isEditor} />;
      case "wholesale_info":
        return <WholesaleInfoSection data={section} theme={theme} isEditor={isEditor} />;
      case "custom_html":
        return <CustomHtmlSection data={section} theme={theme} isEditor={isEditor} />;
      case "logo_bar":
        return <LogoBarSection data={section} theme={theme} isEditor={isEditor} />;
      case "pricing_table":
        return <PricingTableSection data={section} theme={theme} isEditor={isEditor} />;
      case "stats_counter":
        return <StatsCounterSection data={section} theme={theme} isEditor={isEditor} />;
      case "video_hero":
        return <VideoHeroSection data={section} theme={theme} isEditor={isEditor} />;
      case "events":
        return <EventsSection data={section} theme={theme} isEditor={isEditor} />;
      case "location":
        return <LocationSection data={section} theme={theme} isEditor={isEditor} />;
    }
  })();

  // Build wrapper styles from shared SectionBase fields
  const wrapperStyle: React.CSSProperties = { ...style };

  if (section.textAlign) {
    wrapperStyle.textAlign = section.textAlign;
  }

  if (section.sectionBg) {
    Object.assign(wrapperStyle, buildBgStyles(section.sectionBg));
  }

  const needsOverlay = section.sectionBg?.type === "image" && section.sectionBg.imageUrl;

  return (
    <div data-section-id={section.id} style={wrapperStyle}>
      {needsOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${section.sectionBg!.overlayOpacity ?? 0.5})`,
            pointerEvents: "none",
          }}
        />
      )}
      {rendered}
    </div>
  );
}
