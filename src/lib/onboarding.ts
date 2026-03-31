import type { FeatureKey, ProductType, TierLevel } from "@/lib/tier-config";

// ─── Step Definitions ───

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  href: string;
  iconName: string;
  gatedFeature?: FeatureKey;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "logo",
    label: "Upload Logo & Branding",
    description: "Add your logo and set your brand colours.",
    href: "/settings/branding",
    iconName: "Palette",
  },
  {
    key: "product",
    label: "Add Your First Product",
    description: "Create a product to start selling.",
    href: "/products/new",
    iconName: "Package",
  },
  {
    key: "domain",
    label: "Set Up Your Domain",
    description: "Choose your storefront URL slug.",
    href: "/settings/domain",
    iconName: "Globe",
  },
  {
    key: "stripe",
    label: "Connect Stripe",
    description: "Link your Stripe account to accept payments.",
    href: "/settings/integrations?tab=payments",
    iconName: "CreditCard",
  },
  {
    key: "contacts",
    label: "Import Your Contacts",
    description: "Bring in your existing customer list.",
    href: "/contacts/import",
    iconName: "Contact",
  },
  {
    key: "social",
    label: "Connect Social Accounts",
    description: "Link your social media for scheduling.",
    href: "/settings/integrations?tab=social",
    iconName: "Share2",
    gatedFeature: "integrationsSocial",
  },
  {
    key: "wholesale",
    label: "Set Up Wholesale Portal",
    description: "Configure your B2B wholesale storefront.",
    href: "/wholesale-portal/setup",
    iconName: "Store",
  },
  {
    key: "integrations",
    label: "Explore Integrations",
    description: "Connect accounting and other tools.",
    href: "/settings/integrations?tab=accounting",
    iconName: "Link2",
    gatedFeature: "integrationsAccounting",
  },
];

// ─── Response Types ───

export interface OnboardingStepStatus extends OnboardingStep {
  completed: boolean;
  gated: false | { feature: FeatureKey; requiredTier: TierLevel; product: ProductType };
}

export interface OnboardingState {
  dismissed: boolean;
  dismissed_at: string | null;
}

export interface OnboardingResponse {
  steps: OnboardingStepStatus[];
  dismissed: boolean;
  completedCount: number;
  totalCount: number;
}
