import type { FeatureKey, ProductType, TierLevel } from "@/lib/tier-config";

// ─── Step Definitions ───

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  href: string;
  iconName: string;
  gatedFeature?: FeatureKey;
  gatedSubscription?: "marketing";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "business_profile",
    label: "Business Profile",
    description: "Add your business name and details.",
    href: "/settings/business",
    iconName: "Building2",
  },
  {
    key: "branding",
    label: "Set Up Your Branding",
    description: "Add your logo, colours, and brand assets.",
    href: "/settings/branding",
    iconName: "Palette",
  },
  {
    key: "domain",
    label: "Set Up Your Domain",
    description: "Choose your storefront URL slug.",
    href: "/settings/domain",
    iconName: "Globe",
  },
  {
    key: "inventory",
    label: "Add Your Stock",
    description: "Add your roasted stock or green beans to track inventory.",
    href: "/tools/inventory",
    iconName: "Archive",
  },
  {
    key: "product",
    label: "Add Your First Product",
    description: "Create a product to start selling.",
    href: "/products/new",
    iconName: "Package",
  },
  {
    key: "wholesale",
    label: "Set Up Wholesale Portal",
    description: "Configure your B2B wholesale storefront.",
    href: "/wholesale-portal/setup",
    iconName: "Store",
  },
  {
    key: "wholesale_buyers",
    label: "Add Wholesale Buyers",
    description: "Invite or add your B2B customers.",
    href: "/wholesale-buyers",
    iconName: "Users",
  },
  {
    key: "ecommerce",
    label: "Connect Ecommerce",
    description: "Link your ecommerce platform.",
    href: "/settings/integrations?tab=ecommerce",
    iconName: "ShoppingBag",
    gatedFeature: "integrationsEcommerce",
  },
  {
    key: "accounting",
    label: "Connect Accounting",
    description: "Link your accounting software.",
    href: "/settings/integrations?tab=accounting",
    iconName: "Landmark",
    gatedFeature: "integrationsAccounting",
  },
  {
    key: "import_contacts",
    label: "Import Contacts",
    description: "Import your customer and contact list.",
    href: "/contacts/import",
    iconName: "Upload",
  },
  {
    key: "campaigns",
    label: "Create First Campaign",
    description: "Create an email campaign to reach your customers.",
    href: "/marketing/campaigns/new",
    iconName: "Megaphone",
    gatedSubscription: "marketing",
  },
  {
    key: "connect_socials",
    label: "Connect Socials",
    description: "Link your social media accounts.",
    href: "/settings/integrations?tab=social",
    iconName: "Share2",
    gatedSubscription: "marketing",
  },
];

// ─── Response Types ───

export interface OnboardingStepStatus extends OnboardingStep {
  completed: boolean;
  gated: false | {
    feature?: FeatureKey;
    requiredTier?: TierLevel;
    product?: ProductType;
    subscription?: "marketing";
    ctaLabel: string;
  };
}

export interface OnboardingState {
  dismissed: boolean;
  dismissed_at: string | null;
  welcome_seen?: boolean;
}

export interface OnboardingResponse {
  steps: OnboardingStepStatus[];
  dismissed: boolean;
  completedCount: number;
  totalCount: number;
  welcome_seen: boolean;
}
