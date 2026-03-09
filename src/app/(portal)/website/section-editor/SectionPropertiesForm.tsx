"use client";

import { useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp } from "@/components/icons";
import type { WebSection, SectionBg } from "@/lib/website-sections/types";
import { HeroForm } from "./forms/HeroForm";
import { HeroSplitForm } from "./forms/HeroSplitForm";
import { FeaturedProductsForm } from "./forms/FeaturedProductsForm";
import { AllProductsForm } from "./forms/AllProductsForm";
import { AboutForm } from "./forms/AboutForm";
import { AboutTeamForm } from "./forms/AboutTeamForm";
import { TestimonialsForm } from "./forms/TestimonialsForm";
import { TextContentForm } from "./forms/TextContentForm";
import { ImageGalleryForm } from "./forms/ImageGalleryForm";
import { CtaBannerForm } from "./forms/CtaBannerForm";
import { FaqForm } from "./forms/FaqForm";
import { ContactFormForm } from "./forms/ContactFormForm";
import { NewsletterForm } from "./forms/NewsletterForm";
import { InstagramFeedForm } from "./forms/InstagramFeedForm";
import { BlogLatestForm } from "./forms/BlogLatestForm";
import { WholesaleInfoForm } from "./forms/WholesaleInfoForm";
import { CustomHtmlForm } from "./forms/CustomHtmlForm";
import { LogoBarForm } from "./forms/LogoBarForm";
import { PricingTableForm } from "./forms/PricingTableForm";
import { StatsCounterForm } from "./forms/StatsCounterForm";
import { VideoHeroForm } from "./forms/VideoHeroForm";
import { EventsForm } from "./forms/EventsForm";
import { LocationForm } from "./forms/LocationForm";
import { BrewingGuideForm } from "./forms/BrewingGuideForm";
import { FormEmbedForm } from "./forms/FormEmbedForm";
import { ImageUploadField } from "./forms/ImageUploadField";
import { FormField } from "./forms/FormField";

interface SectionPropertiesFormProps {
  section: WebSection;
  onChange: (section: WebSection) => void;
  roasterId: string;
  onClose?: () => void;
}

export function SectionPropertiesForm({ section, onChange, roasterId, onClose }: SectionPropertiesFormProps) {
  const sectionLabel = section.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{sectionLabel}</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Edit section content</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors"
            title="Close panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {renderForm(section, onChange, roasterId)}

        {/* Shared Appearance controls */}
        <AppearancePanel section={section} onChange={onChange} roasterId={roasterId} />
      </div>
    </div>
  );
}

function AppearancePanel({
  section,
  onChange,
  roasterId,
}: {
  section: WebSection;
  onChange: (section: WebSection) => void;
  roasterId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bgType = section.sectionBg?.type ?? "none";
  // Hero and video_hero have their own background image controls — hide duplicate
  const hasOwnBackgroundImage = section.type === "hero" || section.type === "video_hero";

  function updateBg(partial: Partial<SectionBg>) {
    const current = section.sectionBg ?? { type: "solid" };
    onChange({ ...section, sectionBg: { ...current, ...partial } } as WebSection);
  }

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <span>Appearance</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Text Alignment */}
          <FormField label="Text Alignment">
            <div className="flex rounded-md border border-neutral-200 overflow-hidden">
              {(["left", "center", "right"] as const).map((align) => {
                const isActive = (section.textAlign ?? "left") === align;
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onChange({ ...section, textAlign: align } as WebSection)}
                    className={`flex-1 flex items-center justify-center py-2 transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "bg-white text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </FormField>

          {/* Background Type */}
          <FormField label="Background">
            <select
              value={bgType === "none" ? "none" : bgType}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "none") {
                  // Remove sectionBg
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { sectionBg: _, ...rest } = section;
                  onChange(rest as WebSection);
                } else {
                  updateBg({ type: val as SectionBg["type"] });
                }
              }}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
              {!hasOwnBackgroundImage && <option value="image">Image</option>}
            </select>
          </FormField>

          {/* Solid colour */}
          {section.sectionBg?.type === "solid" && (
            <FormField label="Background Colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={section.sectionBg.color ?? "#ffffff"}
                  onChange={(e) => updateBg({ color: e.target.value })}
                  className="w-8 h-8 rounded border border-neutral-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={section.sectionBg.color ?? "#ffffff"}
                  onChange={(e) => updateBg({ color: e.target.value })}
                  className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 font-mono"
                />
              </div>
            </FormField>
          )}

          {/* Gradient */}
          {section.sectionBg?.type === "gradient" && (
            <>
              <FormField label="Gradient From">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={section.sectionBg.gradientFrom ?? "#ffffff"}
                    onChange={(e) => updateBg({ gradientFrom: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={section.sectionBg.gradientFrom ?? "#ffffff"}
                    onChange={(e) => updateBg({ gradientFrom: e.target.value })}
                    className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 font-mono"
                  />
                </div>
              </FormField>
              <FormField label="Gradient To">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={section.sectionBg.gradientTo ?? "#000000"}
                    onChange={(e) => updateBg({ gradientTo: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={section.sectionBg.gradientTo ?? "#000000"}
                    onChange={(e) => updateBg({ gradientTo: e.target.value })}
                    className="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 font-mono"
                  />
                </div>
              </FormField>
              <FormField label="Angle (degrees)">
                <input
                  type="number"
                  value={section.sectionBg.gradientAngle ?? 135}
                  onChange={(e) => updateBg({ gradientAngle: Number(e.target.value) })}
                  min={0}
                  max={360}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
                />
              </FormField>
            </>
          )}

          {/* Image */}
          {section.sectionBg?.type === "image" && (
            <>
              <ImageUploadField
                label="Background Image"
                value={section.sectionBg.imageUrl}
                onChange={(url) => updateBg({ imageUrl: url })}
                roasterId={roasterId}
              />
              <FormField label={`Overlay Opacity (${Math.round((section.sectionBg.overlayOpacity ?? 0.5) * 100)}%)`}>
                <input
                  type="range"
                  value={section.sectionBg.overlayOpacity ?? 0.5}
                  onChange={(e) => updateBg({ overlayOpacity: Number(e.target.value) })}
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full accent-blue-600"
                />
              </FormField>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function renderForm(section: WebSection, onChange: (s: WebSection) => void, roasterId: string) {
  switch (section.type) {
    case "hero":
      return <HeroForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "hero_split":
      return <HeroSplitForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "featured_products":
      return <FeaturedProductsForm data={section} onChange={onChange} />;
    case "all_products":
      return <AllProductsForm data={section} onChange={onChange} />;
    case "about":
      return <AboutForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "about_team":
      return <AboutTeamForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "testimonials":
      return <TestimonialsForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "text_content":
      return <TextContentForm data={section} onChange={onChange} />;
    case "image_gallery":
      return <ImageGalleryForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "cta_banner":
      return <CtaBannerForm data={section} onChange={onChange} />;
    case "faq":
      return <FaqForm data={section} onChange={onChange} />;
    case "contact_form":
      return <ContactFormForm data={section} onChange={onChange} />;
    case "newsletter":
      return <NewsletterForm data={section} onChange={onChange} />;
    case "instagram_feed":
      return <InstagramFeedForm data={section} onChange={onChange} />;
    case "blog_latest":
      return <BlogLatestForm data={section} onChange={onChange} />;
    case "wholesale_info":
      return <WholesaleInfoForm data={section} onChange={onChange} />;
    case "custom_html":
      return <CustomHtmlForm data={section} onChange={onChange} />;
    case "logo_bar":
      return <LogoBarForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "pricing_table":
      return <PricingTableForm data={section} onChange={onChange} />;
    case "stats_counter":
      return <StatsCounterForm data={section} onChange={onChange} />;
    case "video_hero":
      return <VideoHeroForm data={section} onChange={onChange} />;
    case "events":
      return <EventsForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "location":
      return <LocationForm data={section} onChange={onChange} roasterId={roasterId} />;
    case "brewing_guide":
      return <BrewingGuideForm data={section} onChange={onChange} />;
    case "form_embed":
      return <FormEmbedForm data={section} onChange={onChange} roasterId={roasterId} />;
  }
}
