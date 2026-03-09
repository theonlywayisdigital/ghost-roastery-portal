// ─── Website Theme ──────────────────────────────────────────────────────────

export type NavLayout = "logo-left" | "logo-center" | "logo-minimal";

export interface WebsiteTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  logoUrl?: string;
  borderRadius: "sharp" | "rounded" | "pill";
  navLayout?: NavLayout;
  navBgColor?: string;
  navTextColor?: string;
  navTextSize?: "small" | "medium" | "large";
  navLogoSize?: "small" | "medium" | "large";
  navTextHoverColor?: string;
  navButtonBgColor?: string;
  navButtonTextColor?: string;
  navButtonBorderColor?: string;
  navButtonHoverBgColor?: string;
  navButtonHoverTextColor?: string;
  navButtonHoverBorderColor?: string;
}

export const defaultTheme: WebsiteTheme = {
  primaryColor: "#D97706",
  accentColor: "#D97706",
  backgroundColor: "#0D0D0D",
  textColor: "#F5F5F0",
  headingFont: "Figtree, system-ui, sans-serif",
  bodyFont: "Inter, system-ui, sans-serif",
  borderRadius: "rounded",
  navLayout: "logo-left",
  navBgColor: "#ffffff",
  navTextColor: "#475569",
  navTextHoverColor: "#0f172a",
  navTextSize: "medium",
  navLogoSize: "medium",
  navButtonBgColor: "#0f172a",
  navButtonTextColor: "#ffffff",
  navButtonBorderColor: "#0f172a",
  navButtonHoverBgColor: "#1e293b",
  navButtonHoverTextColor: "#ffffff",
  navButtonHoverBorderColor: "#1e293b",
};

/** Map theme borderRadius to CSS border-radius values */
export function getButtonRadius(theme: WebsiteTheme): string {
  switch (theme.borderRadius) {
    case "sharp":
      return "0px";
    case "pill":
      return "9999px";
    case "rounded":
    default:
      return "0.5rem";
  }
}

// ─── Section Base ───────────────────────────────────────────────────────────

export type SectionType =
  | "hero"
  | "hero_split"
  | "featured_products"
  | "all_products"
  | "about"
  | "about_team"
  | "testimonials"
  | "text_content"
  | "image_gallery"
  | "cta_banner"
  | "faq"
  | "contact_form"
  | "newsletter"
  | "instagram_feed"
  | "blog_latest"
  | "wholesale_info"
  | "custom_html"
  | "logo_bar"
  | "pricing_table"
  | "stats_counter"
  | "video_hero"
  | "events"
  | "location"
  | "brewing_guide"
  | "form_embed";

export interface SectionBg {
  type: "solid" | "gradient" | "image";
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  imageUrl?: string;
  overlayOpacity?: number;
}

interface SectionBase {
  id: string;
  type: SectionType;
  visible: boolean;
  textAlign?: "left" | "center" | "right";
  sectionBg?: SectionBg;
}

// ─── Button Data ────────────────────────────────────────────────────────────

export interface ButtonData {
  text: string;
  url: string;
}

// ─── Per-Section Data Interfaces ────────────────────────────────────────────

export interface HeroSectionData extends SectionBase {
  type: "hero";
  heading: string;
  subheading: string;
  backgroundImage?: string;
  overlayOpacity: number;
  primaryButton?: ButtonData;
  secondaryButton?: ButtonData;
}

export interface HeroSplitSectionData extends SectionBase {
  type: "hero_split";
  heading: string;
  subheading: string;
  body: string;
  image?: string;
  imagePosition: "left" | "right";
  button?: ButtonData;
}

export interface FeaturedProductsSectionData extends SectionBase {
  type: "featured_products";
  heading: string;
  subheading: string;
  maxProducts: number;
  showViewAll: boolean;
}

export interface AllProductsSectionData extends SectionBase {
  type: "all_products";
  heading: string;
  showSearch: boolean;
  showFilters: boolean;
  columns: 2 | 3 | 4;
}

export interface AboutSectionData extends SectionBase {
  type: "about";
  heading: string;
  body: string;
  image?: string;
  imagePosition: "left" | "right";
  showSocialLinks: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  image?: string;
  bio?: string;
}

export interface AboutTeamSectionData extends SectionBase {
  type: "about_team";
  heading: string;
  subheading: string;
  members: TeamMember[];
}

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  image?: string;
  rating: number;
}

export interface TestimonialsSectionData extends SectionBase {
  type: "testimonials";
  heading: string;
  testimonials: Testimonial[];
  layout: "grid" | "carousel";
}

export interface TextContentSectionData extends SectionBase {
  type: "text_content";
  heading: string;
  body: string;
  background: "white" | "light" | "dark";
  maxWidth: "narrow" | "medium" | "wide";
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface ImageGallerySectionData extends SectionBase {
  type: "image_gallery";
  heading: string;
  images: GalleryImage[];
  columns: 2 | 3 | 4;
  layout: "grid" | "masonry";
}

export interface CtaBannerSectionData extends SectionBase {
  type: "cta_banner";
  heading: string;
  subheading: string;
  button: ButtonData;
  backgroundStyle: "primary" | "dark" | "gradient";
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionData extends SectionBase {
  type: "faq";
  heading: string;
  subheading: string;
  items: FaqItem[];
}

export interface ContactFormSectionData extends SectionBase {
  type: "contact_form";
  heading: string;
  subheading: string;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showMessage: boolean;
  showSubject: boolean;
  submitText: string;
  showMap: boolean;
  mapAddress?: string;
}

export interface NewsletterSectionData extends SectionBase {
  type: "newsletter";
  heading: string;
  subheading: string;
  buttonText: string;
  background: "white" | "light" | "dark";
}

export interface InstagramFeedSectionData extends SectionBase {
  type: "instagram_feed";
  heading: string;
  handle: string;
}

export interface BlogLatestSectionData extends SectionBase {
  type: "blog_latest";
  heading: string;
  subheading: string;
  maxPosts: number;
}

export interface WholesaleInfoSectionData extends SectionBase {
  type: "wholesale_info";
  heading: string;
  body: string;
  features: string[];
  button: ButtonData;
}

export interface CustomHtmlSectionData extends SectionBase {
  type: "custom_html";
  html: string;
}

export interface LogoItem {
  url: string;
  alt: string;
  link?: string;
}

export interface LogoBarSectionData extends SectionBase {
  type: "logo_bar";
  heading: string;
  logos: LogoItem[];
  grayscale: boolean;
}

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  button: ButtonData;
  highlighted: boolean;
}

export interface PricingTableSectionData extends SectionBase {
  type: "pricing_table";
  heading: string;
  subheading: string;
  tiers: PricingTier[];
}

export interface StatItem {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface StatsCounterSectionData extends SectionBase {
  type: "stats_counter";
  heading: string;
  stats: StatItem[];
  background: "white" | "light" | "dark" | "primary";
}

export interface VideoHeroSectionData extends SectionBase {
  type: "video_hero";
  heading: string;
  subheading: string;
  videoUrl: string;
  overlayOpacity: number;
  primaryButton?: ButtonData;
}

export interface EventItem {
  title: string;
  date: string;
  time: string;
  description: string;
  image?: string;
  link?: string;
}

export interface EventsSectionData extends SectionBase {
  type: "events";
  heading: string;
  subheading: string;
  events: EventItem[];
  layout: "grid" | "list";
}

export interface LocationSectionData extends SectionBase {
  type: "location";
  heading: string;
  body: string;
  address: string;
  image?: string;
  imagePosition: "left" | "right";
  showMap: boolean;
  openingHours: { day: string; hours: string }[];
  phone?: string;
  email?: string;
}

export interface BrewingStep {
  title: string;
  description: string;
  duration?: string;
}

export interface BrewingMethod {
  name: string;
  grind: string;
  ratio: string;
  steps: BrewingStep[];
  icon?: string;
}

export interface BrewingGuideSectionData extends SectionBase {
  type: "brewing_guide";
  heading: string;
  subheading: string;
  methods: BrewingMethod[];
}

export interface FormEmbedSectionData extends SectionBase {
  type: "form_embed";
  heading: string;
  subheading: string;
  formId: string;
}

// ─── Discriminated Union ────────────────────────────────────────────────────

export type WebSection =
  | HeroSectionData
  | HeroSplitSectionData
  | FeaturedProductsSectionData
  | AllProductsSectionData
  | AboutSectionData
  | AboutTeamSectionData
  | TestimonialsSectionData
  | TextContentSectionData
  | ImageGallerySectionData
  | CtaBannerSectionData
  | FaqSectionData
  | ContactFormSectionData
  | NewsletterSectionData
  | InstagramFeedSectionData
  | BlogLatestSectionData
  | WholesaleInfoSectionData
  | CustomHtmlSectionData
  | LogoBarSectionData
  | PricingTableSectionData
  | StatsCounterSectionData
  | VideoHeroSectionData
  | EventsSectionData
  | LocationSectionData
  | BrewingGuideSectionData
  | FormEmbedSectionData;

// ─── Section Catalog Entry (for the "Add Section" modal) ───────────────────

export type SectionCategory =
  | "Hero"
  | "Products"
  | "Content"
  | "Social"
  | "Forms"
  | "Advanced";

export interface SectionCatalogEntry {
  type: SectionType;
  label: string;
  description: string;
  category: SectionCategory;
  icon: string; // lucide icon name
}
