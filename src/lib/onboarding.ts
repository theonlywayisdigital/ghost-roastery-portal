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
    key: "stock",
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
    key: "integrations",
    label: "Explore Integrations",
    description: "Connect accounting, ecommerce, and other tools.",
    href: "/settings/integrations",
    iconName: "Link2",
    gatedFeature: "integrationsAccounting",
  },
  {
    key: "stripe",
    label: "Connect Stripe",
    description: "Link your Stripe account to accept payments.",
    href: "/settings/integrations?tab=payments",
    iconName: "CreditCard",
  },
  {
    key: "campaigns",
    label: "Send Your First Campaign",
    description: "Create an email campaign to reach your customers.",
    href: "/marketing/campaigns/new",
    iconName: "Send",
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
  welcome_seen?: boolean;
}

export interface OnboardingResponse {
  steps: OnboardingStepStatus[];
  dismissed: boolean;
  completedCount: number;
  totalCount: number;
  welcome_seen: boolean;
}
