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

export type ToolsLimitKey =
  | "greenBeans"
  | "roastedStock"
  | "roastLogsPerMonth"
  | "cuppingSessionsPerMonth"
  | "certifications";

export type LimitKey = SalesLimitKey | MarketingLimitKey | ToolsLimitKey;

// ─── Feature Keys ───

export type SalesFeatureKey =
  | "invoices"
  | "pipeline"
  | "customPipelineStages"
  | "salesAnalyticsBasic"
  | "salesAnalyticsFull"
  | "crmEmailIntegration"
  | "customEmailDomain";

export type MarketingFeatureKey =
  | "contentCalendar"
  | "socialScheduling"
  | "automations"
  | "marketingAnalyticsBasic"
  | "marketingAnalyticsFull"
  | "formBrandingRemoved";

export type ToolsFeatureKey =
  | "toolsProductionPlanner"
  | "toolsBreakeven"
  | "toolsLowStockAlerts";

export type FeatureKey = SalesFeatureKey | MarketingFeatureKey | ToolsFeatureKey;

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
  invoices:             { free: true,  starter: true,  growth: true,  pro: true,  scale: true },
  pipeline:             { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  customPipelineStages: { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  salesAnalyticsBasic:  { free: false, starter: true,  growth: true,  pro: true,  scale: true },
  salesAnalyticsFull:   { free: false, starter: false, growth: true,  pro: true,  scale: true },
  crmEmailIntegration:  { free: false, starter: false, growth: true,  pro: true,  scale: true },
  customEmailDomain:    { free: false, starter: true,  growth: true,  pro: true,  scale: true },
};

// ─── Marketing Suite Limits ───

const MARKETING_LIMITS: Record<MarketingLimitKey, Record<TierLevel, number>> = {
  emailSendsPerMonth: { free: 500,  starter: 2000, growth: 5000,  pro: 15000, scale: Infinity },
  embeddedForms:      { free: 1,    starter: 3,    growth: 10,    pro: Infinity, scale: Infinity },
  aiCreditsPerMonth:  { free: 0,    starter: 50,   growth: 150,   pro: 500,   scale: 1500 },
};

// ─── Tools Suite Limits (gated via Sales Suite tier) ───

const TOOLS_LIMITS: Record<ToolsLimitKey, Record<TierLevel, number>> = {
  greenBeans:              { free: 5,  starter: 20,       growth: 50,       pro: Infinity, scale: Infinity },
  roastedStock:            { free: 5,  starter: 20,       growth: 50,       pro: Infinity, scale: Infinity },
  roastLogsPerMonth:       { free: 10, starter: Infinity, growth: Infinity, pro: Infinity, scale: Infinity },
  cuppingSessionsPerMonth: { free: 2,  starter: 10,       growth: Infinity, pro: Infinity, scale: Infinity },
  certifications:          { free: 3,  starter: 10,       growth: Infinity, pro: Infinity, scale: Infinity },
};

// ─── Tools Suite Features (gated via Sales Suite tier) ───

const TOOLS_FEATURES: Record<ToolsFeatureKey, Record<TierLevel, boolean>> = {
  toolsProductionPlanner: { free: false, starter: false, growth: true,  pro: true,  scale: true },
  toolsBreakeven:         { free: false, starter: false, growth: true,  pro: true,  scale: true },
  toolsLowStockAlerts:    { free: false, starter: true,  growth: true,  pro: true,  scale: true },
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

// ─── Platform Fee (GR application fee %, excludes Stripe processing) ───
// Total card payment fees shown to roasters: Free = 5% + 20p, Paid = 2% + 20p
// Stripe takes ~1.5% + 20p, so GR keeps: Free = 3.5%, Paid = 0.5%

const PLATFORM_FEE: Record<TierLevel, number> = {
  free: 3.5,
  starter: 0.5,
  growth: 0.5,
  pro: 0.5,
  scale: 0.5,
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
    // Tools limits (gated via sales tier)
    greenBeans: TOOLS_LIMITS.greenBeans[salesTier],
    roastedStock: TOOLS_LIMITS.roastedStock[salesTier],
    roastLogsPerMonth: TOOLS_LIMITS.roastLogsPerMonth[salesTier],
    cuppingSessionsPerMonth: TOOLS_LIMITS.cuppingSessionsPerMonth[salesTier],
    certifications: TOOLS_LIMITS.certifications[salesTier],
  };
}

// ─── Effective Features (merged — OR logic for booleans) ───

export type TierFeatures = Record<FeatureKey, boolean>;

export function getEffectiveFeatures(salesTier: TierLevel, marketingTier: TierLevel): TierFeatures {
  return {
    // Sales features
    invoices: SALES_FEATURES.invoices[salesTier],
    pipeline: SALES_FEATURES.pipeline[salesTier],
    customPipelineStages: SALES_FEATURES.customPipelineStages[salesTier],
    salesAnalyticsBasic: SALES_FEATURES.salesAnalyticsBasic[salesTier],
    salesAnalyticsFull: SALES_FEATURES.salesAnalyticsFull[salesTier],
    crmEmailIntegration: SALES_FEATURES.crmEmailIntegration[salesTier],
    customEmailDomain: SALES_FEATURES.customEmailDomain[salesTier],
    // Marketing features
    contentCalendar: MARKETING_FEATURES.contentCalendar[marketingTier],
    socialScheduling: MARKETING_FEATURES.socialScheduling[marketingTier],
    automations: MARKETING_FEATURES.automations[marketingTier],
    marketingAnalyticsBasic: MARKETING_FEATURES.marketingAnalyticsBasic[marketingTier],
    marketingAnalyticsFull: MARKETING_FEATURES.marketingAnalyticsFull[marketingTier],
    formBrandingRemoved: MARKETING_FEATURES.formBrandingRemoved[marketingTier],
    // Tools features (gated via sales tier)
    toolsProductionPlanner: TOOLS_FEATURES.toolsProductionPlanner[salesTier],
    toolsBreakeven: TOOLS_FEATURES.toolsBreakeven[salesTier],
    toolsLowStockAlerts: TOOLS_FEATURES.toolsLowStockAlerts[salesTier],
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

  // Check tools features
  const toolsFeatureMap = TOOLS_FEATURES as Record<string, Record<TierLevel, boolean>>;
  if (featureKey in toolsFeatureMap) {
    for (const tier of TIER_ORDER) {
      if (toolsFeatureMap[featureKey][tier]) return { tier, product: "sales" };
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

  const toolsLimitMap = TOOLS_LIMITS as Record<string, Record<TierLevel, number>>;
  if (limitKey in toolsLimitMap) {
    for (const tier of TIER_ORDER) {
      if (toolsLimitMap[limitKey][tier] > currentValue) return { tier, product: "sales" };
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
  greenBeans: "Green Beans",
  roastedStock: "Roasted Stock",
  roastLogsPerMonth: "Roast Logs / Month",
  cuppingSessionsPerMonth: "Cupping Sessions / Month",
  certifications: "Certifications",
};

// ─── Feature Labels (for UI display) ───

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  invoices: "Invoices",
  pipeline: "Sales Pipeline",
  customPipelineStages: "Custom Pipeline Stages",
  salesAnalyticsBasic: "Basic Sales Analytics",
  salesAnalyticsFull: "Advanced Sales Analytics",
  crmEmailIntegration: "CRM Email Integration",
  customEmailDomain: "Custom Email Domain",
  contentCalendar: "Content Calendar",
  socialScheduling: "Social Scheduling",
  automations: "Automations",
  marketingAnalyticsBasic: "Basic Marketing Analytics",
  marketingAnalyticsFull: "Advanced Marketing Analytics",
  formBrandingRemoved: "Remove Form Branding",
  toolsProductionPlanner: "Production Planner",
  toolsBreakeven: "Break-even Calculator",
  toolsLowStockAlerts: "Low Stock Alerts",
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
  greenBeans: "sales",
  roastedStock: "sales",
  roastLogsPerMonth: "sales",
  cuppingSessionsPerMonth: "sales",
  certifications: "sales",
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
    starter: { monthly: "price_1T7yovQuDE0YnEyUbOGoHG7l", annual: "price_1T7yovQuDE0YnEyUBTGoFadD" },
    growth:  { monthly: "price_1T7yowQuDE0YnEyUma5FnPOu", annual: "price_1T7yowQuDE0YnEyU8jRgrly7" },
    pro:     { monthly: "price_1T7yoxQuDE0YnEyU6qVo7USH", annual: "price_1T7yoxQuDE0YnEyU5mwQHyck" },
    scale:   { monthly: "price_1T7yoyQuDE0YnEyUJSPII91G", annual: "price_1T7yoyQuDE0YnEyUiZj6XoKK" },
  },
  marketing: {
    starter: { monthly: "price_1T7yovQuDE0YnEyUo8FCHMXK", annual: "price_1T7yowQuDE0YnEyUC5et4T4M" },
    growth:  { monthly: "price_1T7yoxQuDE0YnEyUTM4EeoFR", annual: "price_1T7yoxQuDE0YnEyURtbazQ8a" },
    pro:     { monthly: "price_1T7yoyQuDE0YnEyUK1ywejko", annual: "price_1T7yoyQuDE0YnEyUjrgBIY8N" },
    scale:   { monthly: "price_1T7yozQuDE0YnEyU3HN7dSjY", annual: "price_1T7yozQuDE0YnEyUUEVm2pLW" },
  },
};

// ─── Website Stripe Price IDs (single product, no tiers) ───

export const STRIPE_WEBSITE_PRICE_IDS: Record<BillingCycle, string> = {
  monthly: "price_1T7ypLQuDE0YnEyUPH30doHA",
  annual: "price_1T7ypLQuDE0YnEyUlJv6VmgJ",
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
  { id: "pack_50",  credits: 50,  pricePence: 490,  label: "50 Credits",  stripePriceId: "price_1T7ypyQuDE0YnEyU9aD9iFp4" },
  { id: "pack_100", credits: 100, pricePence: 890,  label: "100 Credits", stripePriceId: "price_1T7ypzQuDE0YnEyUuHfLBXSg" },
  { id: "pack_250", credits: 250, pricePence: 1990, label: "250 Credits", stripePriceId: "price_1T7ypzQuDE0YnEyUpxhudMTO" },
];

export function getCreditPackByPriceId(priceId: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.stripePriceId === priceId) || null;
}

export function getCreditPackById(packId: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === packId) || null;
}
