import type { SectionCatalogEntry } from "./types";

export const sectionCatalog: SectionCatalogEntry[] = [
  // Hero
  {
    type: "hero",
    label: "Hero Banner",
    description: "Full-screen hero with background image, overlay, heading and CTA buttons.",
    category: "Hero",
    icon: "Image",
  },
  {
    type: "hero_split",
    label: "Split Hero",
    description: "Split layout with image on one side and text on the other.",
    category: "Hero",
    icon: "Columns2",
  },

  // Products
  {
    type: "featured_products",
    label: "Featured Products",
    description: "Showcase your best sellers in a product grid.",
    category: "Products",
    icon: "ShoppingBag",
  },
  {
    type: "all_products",
    label: "All Products",
    description: "Full product catalog with search and filters.",
    category: "Products",
    icon: "Store",
  },

  // Content
  {
    type: "about",
    label: "About / Story",
    description: "Tell your story with an image and text side by side.",
    category: "Content",
    icon: "BookOpen",
  },
  {
    type: "about_team",
    label: "Team Members",
    description: "Introduce your team with photos and bios.",
    category: "Content",
    icon: "Users",
  },
  {
    type: "text_content",
    label: "Text Content",
    description: "Rich text section for policies, guides, or any written content.",
    category: "Content",
    icon: "FileText",
  },
  {
    type: "image_gallery",
    label: "Image Gallery",
    description: "Photo gallery grid showcasing your roastery, products, or events.",
    category: "Content",
    icon: "Images",
  },
  {
    type: "cta_banner",
    label: "Call to Action",
    description: "Full-width banner with heading and CTA button.",
    category: "Content",
    icon: "Megaphone",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Accordion-style frequently asked questions.",
    category: "Content",
    icon: "HelpCircle",
  },
  {
    type: "wholesale_info",
    label: "Wholesale Info",
    description: "Trade information with features list and apply link.",
    category: "Content",
    icon: "Truck",
  },

  // Social
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Customer quotes with star ratings in a grid or carousel.",
    category: "Social",
    icon: "Quote",
  },
  {
    type: "instagram_feed",
    label: "Instagram Feed",
    description: "Display your latest Instagram posts.",
    category: "Social",
    icon: "Instagram",
  },
  {
    type: "blog_latest",
    label: "Latest Blog Posts",
    description: "Show your most recent blog entries.",
    category: "Social",
    icon: "Newspaper",
  },

  // Forms
  {
    type: "contact_form",
    label: "Contact Form",
    description: "Configurable contact form with optional map embed.",
    category: "Forms",
    icon: "Mail",
  },
  {
    type: "newsletter",
    label: "Newsletter Signup",
    description: "Email subscription form to grow your mailing list.",
    category: "Forms",
    icon: "Bell",
  },
  {
    type: "form_embed",
    label: "Marketing Form",
    description: "Embed one of your marketing forms directly on the page.",
    category: "Forms",
    icon: "ClipboardList",
  },

  // Advanced
  {
    type: "custom_html",
    label: "Custom HTML",
    description: "Add custom HTML for embeds, widgets, or advanced layouts.",
    category: "Advanced",
    icon: "Code",
  },

  // New section types
  {
    type: "logo_bar",
    label: "Logo Bar",
    description: "Horizontal strip of partner or press logos.",
    category: "Content",
    icon: "Award",
  },
  {
    type: "pricing_table",
    label: "Pricing Table",
    description: "Subscription or product pricing tiers in a responsive grid.",
    category: "Products",
    icon: "CreditCard",
  },
  {
    type: "stats_counter",
    label: "Stats / Numbers",
    description: "Large numbers grid to showcase key metrics.",
    category: "Content",
    icon: "TrendingUp",
  },
  {
    type: "video_hero",
    label: "Video Hero",
    description: "Full-width video background with heading and CTA overlay.",
    category: "Hero",
    icon: "Play",
  },
  {
    type: "events",
    label: "Events",
    description: "Showcase upcoming tastings, workshops, and events.",
    category: "Content",
    icon: "CalendarDays",
  },
  {
    type: "location",
    label: "Location / Caf\u00e9",
    description: "Show your caf\u00e9 location with address, opening hours, and map.",
    category: "Content",
    icon: "MapPin",
  },
  {
    type: "brewing_guide",
    label: "Brewing Guide",
    description: "Interactive timeline for coffee brewing methods and recipes.",
    category: "Content",
    icon: "Coffee",
  },
];
