// ═══════════════════════════════════════════════════════════════
// Tier Configuration — Single Source of Truth
// Pure TypeScript constants. No database queries.
// ═══════════════════════════════════════════════════════════════

export type TierLevel = "free" | "starter" | "growth" | "pro" | "scale";
export type ProductType = "sales" | "marketing" | "website";

// ─── Limit Keys ───

export type SalesLimitKey =
  | "products"
  | "wholesaleOrdersPerMonth"
  | "wholesaleAccounts"
  | "crmContacts"
  | "teamMembers";

export type MarketingLimitKey =
  | "emailSendsPerMonth"
  | "embeddedForms"
  | "aiCreditsPerMonth";

export type LimitKey = SalesLimitKey | MarketingLimitKey;

// ─── Feature Keys ───

export type SalesFeatureKey =
  | "invoices"
  | "salesAnalyticsBasic"
  | "salesAnalyticsFull"
  | "crmEmailIntegration";

export type MarketingFeatureKey =
  | "contentCalendar"
  | "socialScheduling"
  | "automations"
  | "marketingAnalyticsBasic"
  | "marketingAnalyticsFull"
  | "formBrandingRemoved";

export type FeatureKey = SalesFeatureKey | MarketingFeatureKey;

// ─── Tier Order ───

const TIER_ORDER: TierLevel[] = ["free", "starter", "growth", "pro", "scale"];

export function tierIndex(tier: TierLevel): number {
  return TIER_ORDER.indexOf(tier);
}

export function isHigherTier(a: TierLevel, b: TierLevel): boolean {
  return tierIndex(a) > tierIndex(b);
}

// ─── Sales Suite Limits ───

const SALES_LIMITS: Record<SalesLimitKey, Record<TierLevel, number>> = {
  products:                { free: 5,   starter: 10,  growth: 20,   pro: 50,    scale: Infinity },
  wholesaleOrdersPerMonth: { free: 30,  starter: 150, growth: 400,  pro: 800,   scale: Infinity },
  wholesaleAccounts:       { free: 5,   starter: 20,  growth: 50,   pro: 200,   scale: Infinity },
  crmContacts:             { free: 100, starter: 500, growth: 1500, pro: 5000,  scale: Infinity },
  teamMembers:             { free: 1,   starter: 2,   growth: 3,    pro: 5,     scale: 10 },
};

// ─── Sales Suite Features ───

const SALES_FEATURES: Record<SalesFeatureKey, Record<TierLevel, boolean>> = {
  invoices:             { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  salesAnalyticsBasic:  { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  salesAnalyticsFull:   { free: false, starter: false, growth: true,  pro: true,  scale: true },
  crmEmailIntegration:  { free: false, starter: false, growth: true,  pro: true,  scale: true },
};

// ─── Marketing Suite Limits ───

const MARKETING_LIMITS: Record<MarketingLimitKey, Record<TierLevel, number>> = {
  emailSendsPerMonth: { free: 500,  starter: 2000, growth: 5000,  pro: 15000, scale: Infinity },
  embeddedForms:      { free: 1,    starter: 3,    growth: 10,    pro: Infinity, scale: Infinity },
  aiCreditsPerMonth:  { free: 0,    starter: 50,   growth: 150,   pro: 500,   scale: 1500 },
};

// ─── Marketing Suite Features ───

const MARKETING_FEATURES: Record<MarketingFeatureKey, Record<TierLevel, boolean>> = {
  contentCalendar:         { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  socialScheduling:        { free: false, starter: false, growth: true,  pro: true,  scale: true },
  automations:             { free: false, starter: false, growth: true,  pro: true,  scale: true },
  marketingAnalyticsBasic: { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  marketingAnalyticsFull:  { free: false, starter: false, growth: true,  pro: true,  scale: true },
  formBrandingRemoved:     { free: false, starter: true,  growth: true,  pro: true,  scale: true },
};

// ─── Platform Fee ───

const PLATFORM_FEE: Record<TierLevel, number> = {
  free: 5,
  starter: 0,
  growth: 0,
  pro: 0,
  scale: 0,
};

// ─── Pricing (pence) ───

export interface TierPricing {
  monthly: number;
  annual: number; // per-month cost when billed annually
}

const SALES_PRICING: Record<TierLevel, TierPricing> = {
  free:    { monthly: 0,     annual: 0 },
  starter: { monthly: 2900,  annual: 2400 },
  growth:  { monthly: 4900,  annual: 4100 },
  pro:     { monthly: 7900,  annual: 6600 },
  scale:   { monthly: 14900, annual: 12400 },
};

const MARKETING_PRICING: Record<TierLevel, TierPricing> = {
  free:    { monthly: 0,     annual: 0 },
  starter: { monthly: 1900,  annual: 1600 },
  growth:  { monthly: 3900,  annual: 3300 },
  pro:     { monthly: 5900,  annual: 4900 },
  scale:   { monthly: 9900,  annual: 8300 },
};

// ─── Website Pricing (single product, no tiers) ───

export const WEBSITE_PRICING: TierPricing = {
  monthly: 1900,
  annual: 1600,
};

// ─── Tier Display Names ───

export const TIER_NAMES: Record<TierLevel, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  scale: "Scale",
};

// ─── Effective Limits (merged from both products) ───

export type TierLimits = Record<LimitKey, number>;

export function getEffectiveLimits(salesTier: TierLevel, marketingTier: TierLevel): TierLimits {
  return {
    // Sales limits
    products: SALES_LIMITS.products[salesTier],
    wholesaleOrdersPerMonth: SALES_LIMITS.wholesaleOrdersPerMonth[salesTier],
    wholesaleAccounts: SALES_LIMITS.wholesaleAccounts[salesTier],
    crmContacts: SALES_LIMITS.crmContacts[salesTier],
    teamMembers: SALES_LIMITS.teamMembers[salesTier],
    // Marketing limits
    emailSendsPerMonth: MARKETING_LIMITS.emailSendsPerMonth[marketingTier],
    embeddedForms: MARKETING_LIMITS.embeddedForms[marketingTier],
    aiCreditsPerMonth: MARKETING_LIMITS.aiCreditsPerMonth[marketingTier],
  };
}

// ─── Effective Features (merged — OR logic for booleans) ───

export type TierFeatures = Record<FeatureKey, boolean>;

export function getEffectiveFeatures(salesTier: TierLevel, marketingTier: TierLevel): TierFeatures {
  return {
    // Sales features
    invoices: SALES_FEATURES.invoices[salesTier],
    salesAnalyticsBasic: SALES_FEATURES.salesAnalyticsBasic[salesTier],
    salesAnalyticsFull: SALES_FEATURES.salesAnalyticsFull[salesTier],
    crmEmailIntegration: SALES_FEATURES.crmEmailIntegration[salesTier],
    // Marketing features
    contentCalendar: MARKETING_FEATURES.contentCalendar[marketingTier],
    socialScheduling: MARKETING_FEATURES.socialScheduling[marketingTier],
    automations: MARKETING_FEATURES.automations[marketingTier],
    marketingAnalyticsBasic: MARKETING_FEATURES.marketingAnalyticsBasic[marketingTier],
    marketingAnalyticsFull: MARKETING_FEATURES.marketingAnalyticsFull[marketingTier],
    formBrandingRemoved: MARKETING_FEATURES.formBrandingRemoved[marketingTier],
  };
}

// ─── Platform Fee ───

export function getEffectivePlatformFee(salesTier: TierLevel): number {
  return PLATFORM_FEE[salesTier];
}

// ─── Formatting ───

export function formatLimit(value: number): string {
  if (value === Infinity) return "Unlimited";
  return value.toLocaleString("en-GB");
}

// ─── Minimum Tier for Feature ───

export function getMinimumTierForFeature(featureKey: FeatureKey): { tier: TierLevel; product: ProductType } {
  // Check sales features first
  const salesFeatureMap = SALES_FEATURES as Record<string, Record<TierLevel, boolean>>;
  if (featureKey in salesFeatureMap) {
    for (const tier of TIER_ORDER) {
      if (salesFeatureMap[featureKey][tier]) return { tier, product: "sales" };
    }
  }

  // Check marketing features
  const marketingFeatureMap = MARKETING_FEATURES as Record<string, Record<TierLevel, boolean>>;
  if (featureKey in marketingFeatureMap) {
    for (const tier of TIER_ORDER) {
      if (marketingFeatureMap[featureKey][tier]) return { tier, product: "marketing" };
    }
  }

  return { tier: "scale", product: "sales" }; // fallback
}

// ─── Minimum Tier for Limit ───

export function getMinimumTierForHigherLimit(limitKey: LimitKey, currentValue: number): { tier: TierLevel; product: ProductType } | null {
  const salesLimitMap = SALES_LIMITS as Record<string, Record<TierLevel, number>>;
  if (limitKey in salesLimitMap) {
    for (const tier of TIER_ORDER) {
      if (salesLimitMap[limitKey][tier] > currentValue) return { tier, product: "sales" };
    }
    return null;
  }

  const marketingLimitMap = MARKETING_LIMITS as Record<string, Record<TierLevel, number>>;
  if (limitKey in marketingLimitMap) {
    for (const tier of TIER_ORDER) {
      if (marketingLimitMap[limitKey][tier] > currentValue) return { tier, product: "marketing" };
    }
    return null;
  }

  return null;
}

// ─── Pricing Getters ───

export function getSalesPricing(tier: TierLevel): TierPricing {
  return SALES_PRICING[tier];
}

export function getMarketingPricing(tier: TierLevel): TierPricing {
  return MARKETING_PRICING[tier];
}

export function getAllSalesPricing(): Record<TierLevel, TierPricing> {
  return SALES_PRICING;
}

export function getAllMarketingPricing(): Record<TierLevel, TierPricing> {
  return MARKETING_PRICING;
}

// ─── Limit Labels (for UI display) ───

export const LIMIT_LABELS: Record<LimitKey, string> = {
  products: "Products",
  wholesaleOrdersPerMonth: "Wholesale Orders / Month",
  wholesaleAccounts: "Wholesale Accounts",
  crmContacts: "CRM Contacts",
  teamMembers: "Team Members",
  emailSendsPerMonth: "Email Sends / Month",
  embeddedForms: "Embedded Forms",
  aiCreditsPerMonth: "AI Credits / Month",
};

// ─── Feature Labels (for UI display) ───

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  invoices: "Invoices",
  salesAnalyticsBasic: "Basic Sales Analytics",
  salesAnalyticsFull: "Advanced Sales Analytics",
  crmEmailIntegration: "CRM Email Integration",
  contentCalendar: "Content Calendar",
  socialScheduling: "Social Scheduling",
  automations: "Automations",
  marketingAnalyticsBasic: "Basic Marketing Analytics",
  marketingAnalyticsFull: "Advanced Marketing Analytics",
  formBrandingRemoved: "Remove Form Branding",
};

// ─── Limit product mapping ───

export const LIMIT_PRODUCT_MAP: Record<LimitKey, ProductType> = {
  products: "sales",
  wholesaleOrdersPerMonth: "sales",
  wholesaleAccounts: "sales",
  crmContacts: "sales",
  teamMembers: "sales",
  emailSendsPerMonth: "marketing",
  embeddedForms: "marketing",
  aiCreditsPerMonth: "marketing",
};

// ─── Get all limits for a specific product and tier ───

export function getSalesLimits(tier: TierLevel): Record<SalesLimitKey, number> {
  const result = {} as Record<SalesLimitKey, number>;
  for (const key of Object.keys(SALES_LIMITS) as SalesLimitKey[]) {
    result[key] = SALES_LIMITS[key][tier];
  }
  return result;
}

export function getMarketingLimits(tier: TierLevel): Record<MarketingLimitKey, number> {
  const result = {} as Record<MarketingLimitKey, number>;
  for (const key of Object.keys(MARKETING_LIMITS) as MarketingLimitKey[]) {
    result[key] = MARKETING_LIMITS[key][tier];
  }
  return result;
}

export function getSalesFeatures(tier: TierLevel): Record<SalesFeatureKey, boolean> {
  const result = {} as Record<SalesFeatureKey, boolean>;
  for (const key of Object.keys(SALES_FEATURES) as SalesFeatureKey[]) {
    result[key] = SALES_FEATURES[key][tier];
  }
  return result;
}

export function getMarketingFeatures(tier: TierLevel): Record<MarketingFeatureKey, boolean> {
  const result = {} as Record<MarketingFeatureKey, boolean>;
  for (const key of Object.keys(MARKETING_FEATURES) as MarketingFeatureKey[]) {
    result[key] = MARKETING_FEATURES[key][tier];
  }
  return result;
}

// ─── Stripe Price IDs ───
// Generated by scripts/setup-stripe-products.ts — replace placeholders after running

export type BillingCycle = "monthly" | "annual";

type PaidTierLevel = Exclude<TierLevel, "free">;

export type TieredProductType = Exclude<ProductType, "website">;

export const STRIPE_PRICE_IDS: Record<TieredProductType, Record<PaidTierLevel, Record<BillingCycle, string>>> = {
  sales: {
    starter: { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    growth:  { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    pro:     { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    scale:   { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
  },
  marketing: {
    starter: { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    growth:  { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    pro:     { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
    scale:   { monthly: "REPLACE_ME", annual: "REPLACE_ME" },
  },
};

// ─── Website Stripe Price IDs (single product, no tiers) ───

export const STRIPE_WEBSITE_PRICE_IDS: Record<BillingCycle, string> = {
  monthly: "REPLACE_ME",
  annual: "REPLACE_ME",
};

export function getWebsitePriceId(billingCycle: BillingCycle): string {
  return STRIPE_WEBSITE_PRICE_IDS[billingCycle];
}

export function getStripePriceId(product: ProductType, tier: TierLevel, billingCycle: BillingCycle): string | null {
  if (product === "website") return getWebsitePriceId(billingCycle);
  if (tier === "free") return null;
  const tieredProduct = product as TieredProductType;
  return STRIPE_PRICE_IDS[tieredProduct]?.[tier as PaidTierLevel]?.[billingCycle] || null;
}

export function getTierFromPriceId(priceId: string): { product: ProductType; tier: PaidTierLevel; billingCycle: BillingCycle } | null {
  // Check website price IDs first (no tier — return "starter" as placeholder)
  for (const cycle of ["monthly", "annual"] as BillingCycle[]) {
    if (STRIPE_WEBSITE_PRICE_IDS[cycle] === priceId) {
      return { product: "website", tier: "starter", billingCycle: cycle };
    }
  }

  for (const product of ["sales", "marketing"] as TieredProductType[]) {
    for (const tier of ["starter", "growth", "pro", "scale"] as PaidTierLevel[]) {
      for (const cycle of ["monthly", "annual"] as BillingCycle[]) {
        if (STRIPE_PRICE_IDS[product][tier][cycle] === priceId) {
          return { product, tier, billingCycle: cycle };
        }
      }
    }
  }
  return null;
}

// ─── AI Credit Packs (one-time purchase) ───

export interface CreditPack {
  id: string;
  credits: number;
  pricePence: number; // GBP pence
  label: string;
  stripePriceId: string; // Set after running setup script
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_50",  credits: 50,  pricePence: 490,  label: "50 Credits",  stripePriceId: "REPLACE_ME" },
  { id: "pack_100", credits: 100, pricePence: 890,  label: "100 Credits", stripePriceId: "REPLACE_ME" },
  { id: "pack_250", credits: 250, pricePence: 1990, label: "250 Credits", stripePriceId: "REPLACE_ME" },
];

export function getCreditPackByPriceId(priceId: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.stripePriceId === priceId) || null;
}

export function getCreditPackById(packId: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === packId) || null;
}
