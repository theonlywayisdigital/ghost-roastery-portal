// ═══════════════════════════════════════════════════════════════
// Tier Configuration — Single Source of Truth
// Pure TypeScript constants. No database queries.
// ═══════════════════════════════════════════════════════════════

export type TierLevel = "growth" | "pro" | "scale";
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
  | "cuppingSessionsPerMonth";

export type LimitKey = SalesLimitKey | MarketingLimitKey | ToolsLimitKey;

// ─── Feature Keys ───

export type SalesFeatureKey =
  | "invoices"
  | "pipeline"
  | "customPipelineStages"
  | "customEmailDomain"
  | "integrationsAccounting"
  | "integrationsEcommerce"
  | "orderExtraction";

export type MarketingFeatureKey =
  | "contentCalendar"
  | "socialScheduling"
  | "integrationsSocial"
  | "removeFormBranding";

export type ToolsFeatureKey =
  | "toolsProductionPlanner"
  | "toolsBreakeven";

export type FeatureKey = SalesFeatureKey | MarketingFeatureKey | ToolsFeatureKey;

// ─── Tier Order ───

const TIER_ORDER: TierLevel[] = ["growth", "pro", "scale"];

export function tierIndex(tier: TierLevel): number {
  return TIER_ORDER.indexOf(tier);
}

export function isHigherTier(a: TierLevel, b: TierLevel): boolean {
  return tierIndex(a) > tierIndex(b);
}

// ─── Sales Suite Limits ───

const SALES_LIMITS: Record<SalesLimitKey, Record<TierLevel, number>> = {
  products:                { growth: 5,    pro: 25,    scale: 100 },
  wholesaleOrdersPerMonth: { growth: 100,  pro: 250,   scale: 1000 },
  wholesaleAccounts:       { growth: 30,   pro: 100,   scale: 500 },
  crmContacts:             { growth: 1500, pro: 5000,  scale: 25000 },
  teamMembers:             { growth: 1,    pro: 3,     scale: 10 },
};

// ─── Sales Suite Features ───

const SALES_FEATURES: Record<SalesFeatureKey, Record<TierLevel, boolean>> = {
  invoices:                { growth: true,  pro: true,  scale: true },
  pipeline:                { growth: true,  pro: true,  scale: true },
  customPipelineStages:    { growth: true,  pro: true,  scale: true },
  customEmailDomain:       { growth: true,  pro: true,  scale: true },
  integrationsAccounting:  { growth: false, pro: true,  scale: true },
  integrationsEcommerce:   { growth: false, pro: true,  scale: true },
  orderExtraction:         { growth: true,  pro: true,  scale: true },
};

// ─── Marketing Suite Limits ───

const MARKETING_LIMITS: Record<MarketingLimitKey, Record<TierLevel, number>> = {
  emailSendsPerMonth: { growth: 5000,  pro: 25000, scale: 50000 },
  embeddedForms:      { growth: 3,     pro: 10,    scale: 25 },
  aiCreditsPerMonth:  { growth: 150,   pro: 500,   scale: 2000 },
};

// ─── Tools Suite Limits (gated via Sales Suite tier) ───

const TOOLS_LIMITS: Record<ToolsLimitKey, Record<TierLevel, number>> = {
  greenBeans:              { growth: Infinity, pro: Infinity, scale: Infinity },
  roastedStock:            { growth: Infinity, pro: Infinity, scale: Infinity },
  roastLogsPerMonth:       { growth: Infinity, pro: Infinity, scale: Infinity },
  cuppingSessionsPerMonth: { growth: Infinity, pro: Infinity, scale: Infinity },
};

// ─── Tools Suite Features (gated via Sales Suite tier) ───

const TOOLS_FEATURES: Record<ToolsFeatureKey, Record<TierLevel, boolean>> = {
  toolsProductionPlanner: { growth: true,  pro: true,  scale: true },
  toolsBreakeven:         { growth: true,  pro: true,  scale: true },
};

// ─── Marketing Suite Features ───

const MARKETING_FEATURES: Record<MarketingFeatureKey, Record<TierLevel, boolean>> = {
  contentCalendar:         { growth: true,  pro: true,  scale: true },
  socialScheduling:        { growth: true,  pro: true,  scale: true },
  integrationsSocial:      { growth: true,  pro: true,  scale: true },
  removeFormBranding:      { growth: false, pro: true,  scale: true },
};

// ─── Platform Fee ───
// No platform fee — roasters only pay standard Stripe processing fees directly to Stripe.
// These constants are kept at 0 so all fee-calculation code paths return 0.

const STRIPE_PROCESSING_FEE_PERCENT = 0;
const STRIPE_PROCESSING_FEE_FIXED_PENCE = 0;

// ─── Pricing (pence) ───

export interface TierPricing {
  monthly: number;
  annual: number; // per-month cost when billed annually
}

const SALES_PRICING: Record<TierLevel, TierPricing> = {
  growth: { monthly: 3900,  annual: 3300 },
  pro:    { monthly: 7900,  annual: 6600 },
  scale:  { monthly: 12900, annual: 10800 },
};

const MARKETING_PRICING: Record<TierLevel, TierPricing> = {
  growth: { monthly: 1900,  annual: 1600 },
  pro:    { monthly: 4900, annual: 4200 },
  scale:  { monthly: 9900, annual: 8400 },
};

// ─── Website Pricing (single product, no tiers) ───

export const WEBSITE_PRICING: TierPricing = {
  monthly: 1900,
  annual: 1600,
};

// ─── Tier Display Names ───

export const TIER_NAMES: Record<TierLevel, string> = {
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
    customEmailDomain: SALES_FEATURES.customEmailDomain[salesTier],
    integrationsAccounting: SALES_FEATURES.integrationsAccounting[salesTier],
    integrationsEcommerce: SALES_FEATURES.integrationsEcommerce[salesTier],
    orderExtraction: SALES_FEATURES.orderExtraction[salesTier],
    // Marketing features
    contentCalendar: MARKETING_FEATURES.contentCalendar[marketingTier],
    socialScheduling: MARKETING_FEATURES.socialScheduling[marketingTier],
    integrationsSocial: MARKETING_FEATURES.integrationsSocial[marketingTier],
    removeFormBranding: MARKETING_FEATURES.removeFormBranding[marketingTier],
    // Tools features (gated via sales tier)
    toolsProductionPlanner: TOOLS_FEATURES.toolsProductionPlanner[salesTier],
    toolsBreakeven: TOOLS_FEATURES.toolsBreakeven[salesTier],
  };
}

// ─── Stripe Processing Fee ───

/** Returns the platform fee percentage. Always 0 — no platform fee. */
export function getEffectivePlatformFee(_salesTier: TierLevel): number {
  return 0;
}

/** Returns the fixed per-transaction platform fee in pence. Always 0. */
export function getStripeFixedFeePence(): number {
  return 0;
}

/** Calculate the platform fee in pence for a given amount. Always returns 0. */
export function calculateStripeProcessingFee(_amountPence: number): number {
  return 0;
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
};

// ─── Feature Labels (for UI display) ───

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  invoices: "Invoices",
  pipeline: "Sales Pipeline",
  customPipelineStages: "Custom Pipeline Stages",
  customEmailDomain: "Custom Email Domain",
  integrationsAccounting: "Accounting Integrations",
  integrationsEcommerce: "E-commerce Integrations",
  orderExtraction: "AI Order Extraction",
  contentCalendar: "Content Calendar",
  socialScheduling: "Social Scheduling",
  integrationsSocial: "Social Integrations",
  toolsProductionPlanner: "Production Planner",
  toolsBreakeven: "Break-even Calculator",
  removeFormBranding: "Remove Form Branding",
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

type PaidTierLevel = TierLevel;

export type TieredProductType = Exclude<ProductType, "website">;

export const STRIPE_PRICE_IDS: Record<TieredProductType, Record<PaidTierLevel, Record<BillingCycle, string>>> = {
  sales: {
    growth: { monthly: "price_1TGlrdQuDE0YnEyUE6oLzr2E", annual: "price_1TGlrdQuDE0YnEyUyT1Gcfd3" },
    pro:    { monthly: "price_1TGlreQuDE0YnEyUnUB37ccs", annual: "price_1TGlreQuDE0YnEyUtDTLDFep" },
    scale:  { monthly: "price_1TGlrfQuDE0YnEyUnPARPTe8", annual: "price_1TGlrfQuDE0YnEyUMqoYkhFc" },
  },
  marketing: {
    growth: { monthly: "price_1TKNV5QuDE0YnEyUmDXO9fvt", annual: "price_1TKNVHQuDE0YnEyUcmNeBqvw" },
    pro:    { monthly: "price_1TKNVIQuDE0YnEyUtSD4oAUV", annual: "price_1TKNVIQuDE0YnEyUltGdlOuY" },
    scale:  { monthly: "price_1TKNVJQuDE0YnEyUvoU6469e", annual: "price_1TKNVKQuDE0YnEyUZZ7qaM3L" },
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
  const tieredProduct = product as TieredProductType;
  return STRIPE_PRICE_IDS[tieredProduct]?.[tier as PaidTierLevel]?.[billingCycle] || null;
}

// Legacy price IDs that map to current tiers (for webhook events referencing old prices)
const LEGACY_PRICE_MAP: Record<string, { product: ProductType; tier: PaidTierLevel; billingCycle: BillingCycle }> = {
  // Old Starter prices → Growth
  "price_1T7yovQuDE0YnEyUbOGoHG7l": { product: "sales", tier: "growth", billingCycle: "monthly" },
  "price_1T7yovQuDE0YnEyUBTGoFadD": { product: "sales", tier: "growth", billingCycle: "annual" },
  "price_1T7yovQuDE0YnEyUo8FCHMXK": { product: "marketing", tier: "growth", billingCycle: "monthly" },
  "price_1T7yowQuDE0YnEyUC5et4T4M": { product: "marketing", tier: "growth", billingCycle: "annual" },
  // Old Growth prices (amounts changed, IDs retired)
  "price_1T7yowQuDE0YnEyUma5FnPOu": { product: "sales", tier: "growth", billingCycle: "monthly" },
  "price_1T7yowQuDE0YnEyU8jRgrly7": { product: "sales", tier: "growth", billingCycle: "annual" },
  "price_1T7yoxQuDE0YnEyUTM4EeoFR": { product: "marketing", tier: "growth", billingCycle: "monthly" },
  "price_1T7yoxQuDE0YnEyURtbazQ8a": { product: "marketing", tier: "growth", billingCycle: "annual" },
  // Old Pro prices (replaced by new Stripe prices)
  "price_1T7yoxQuDE0YnEyU6qVo7USH": { product: "sales", tier: "pro", billingCycle: "monthly" },
  "price_1T7yoxQuDE0YnEyU5mwQHyck": { product: "sales", tier: "pro", billingCycle: "annual" },
  "price_1T7yoyQuDE0YnEyUK1ywejko": { product: "marketing", tier: "pro", billingCycle: "monthly" },
  "price_1T7yoyQuDE0YnEyUjrgBIY8N": { product: "marketing", tier: "pro", billingCycle: "annual" },
  // Old Scale prices (Sales amount changed, Marketing unchanged but new price IDs)
  "price_1T7yoyQuDE0YnEyUJSPII91G": { product: "sales", tier: "scale", billingCycle: "monthly" },
  "price_1T7yoyQuDE0YnEyUiZj6XoKK": { product: "sales", tier: "scale", billingCycle: "annual" },
  "price_1T7yozQuDE0YnEyU3HN7dSjY": { product: "marketing", tier: "scale", billingCycle: "monthly" },
  "price_1T7yozQuDE0YnEyUUEVm2pLW": { product: "marketing", tier: "scale", billingCycle: "annual" },
  // Old Marketing prices (amounts reduced ~30%, April 2026)
  "price_1TGlrdQuDE0YnEyUlRz4FKYq": { product: "marketing", tier: "growth", billingCycle: "monthly" },
  "price_1TGlreQuDE0YnEyUVg1DtHWs": { product: "marketing", tier: "growth", billingCycle: "annual" },
  "price_1TGlrfQuDE0YnEyUlaoBndf6": { product: "marketing", tier: "pro", billingCycle: "monthly" },
  "price_1TGlrfQuDE0YnEyUqNS4J2QL": { product: "marketing", tier: "pro", billingCycle: "annual" },
  "price_1TGlrgQuDE0YnEyUZL7axIWe": { product: "marketing", tier: "scale", billingCycle: "monthly" },
  "price_1TGlrgQuDE0YnEyU8gRQjZAA": { product: "marketing", tier: "scale", billingCycle: "annual" },
  // Old Marketing prices (£19/£39/£69 → £9/£24/£49, April 2026)
  "price_1TJfD3QuDE0YnEyUDjKKZOx5": { product: "marketing", tier: "growth", billingCycle: "monthly" },
  "price_1TJfD3QuDE0YnEyUv8F4CA6e": { product: "marketing", tier: "growth", billingCycle: "annual" },
  "price_1TJfD4QuDE0YnEyUrko1WOSz": { product: "marketing", tier: "pro", billingCycle: "monthly" },
  "price_1TJfD4QuDE0YnEyUPuFjpqbL": { product: "marketing", tier: "pro", billingCycle: "annual" },
  "price_1TJfD4QuDE0YnEyUAc1PwFJf": { product: "marketing", tier: "scale", billingCycle: "monthly" },
  "price_1TJfD4QuDE0YnEyU5MBnac0A": { product: "marketing", tier: "scale", billingCycle: "annual" },
  // Old Marketing prices (£9/£24/£49 → £19/£49/£99, April 2026)
  "price_1TJxwfQuDE0YnEyUiMroAVRS": { product: "marketing", tier: "growth", billingCycle: "monthly" },
  "price_1TJxwgQuDE0YnEyUNoxRBUmi": { product: "marketing", tier: "growth", billingCycle: "annual" },
  "price_1TJxwgQuDE0YnEyUBvEgAyhG": { product: "marketing", tier: "pro", billingCycle: "monthly" },
  "price_1TJxwgQuDE0YnEyUNJFWIc8b": { product: "marketing", tier: "pro", billingCycle: "annual" },
  "price_1TJxwhQuDE0YnEyUnez7qPi7": { product: "marketing", tier: "scale", billingCycle: "monthly" },
  "price_1TJxwhQuDE0YnEyUcgCEnpM6": { product: "marketing", tier: "scale", billingCycle: "annual" },
};

export function getTierFromPriceId(priceId: string): { product: ProductType; tier: PaidTierLevel; billingCycle: BillingCycle } | null {
  // Check legacy price IDs first (old Starter / old Growth / old Scale prices)
  const legacy = LEGACY_PRICE_MAP[priceId];
  if (legacy) return legacy;

  // Check website price IDs (no tier — return "growth" as placeholder)
  for (const cycle of ["monthly", "annual"] as BillingCycle[]) {
    if (STRIPE_WEBSITE_PRICE_IDS[cycle] === priceId) {
      return { product: "website", tier: "growth", billingCycle: cycle };
    }
  }

  for (const product of ["sales", "marketing"] as TieredProductType[]) {
    for (const tier of ["growth", "pro", "scale"] as PaidTierLevel[]) {
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

// ─── AI Action Types & Credit Costs ───

/**
 * Every AI action that consumes credits, grouped by cost tier.
 * Light (1), Special (2), Medium (3), Heavy (5).
 */
export type AiActionType =
  // Light (1 credit) — quick suggestions via AiGenerateButton
  | "email_subject"
  | "email_preview"
  | "email_body"
  | "social_caption"
  | "product_name"
  | "product_description"
  | "product_meta_description"
  | "discount_description"
  | "form_description"
  | "form_success_message"
  | "website_heading"
  | "website_body"
  | "website_meta_title"
  | "website_meta_description"
  // Special (2 credits)
  | "extract_order"
  // Medium (3 credits)
  | "generate_email"
  | "generate_blog_post"
  | "compose_contact_email"
  // Heavy (5 credits)
  | "generate_automation"
  | "refine_automation"
  | "plan_campaign"
  | "plan_social"
  | "plan_automation"
  | "plan_ideas";

export const AI_CREDIT_COSTS: Record<AiActionType, number> = {
  // Light — 1 credit
  email_subject: 1,
  email_preview: 1,
  email_body: 1,
  social_caption: 1,
  product_name: 1,
  product_description: 1,
  product_meta_description: 1,
  discount_description: 1,
  form_description: 1,
  form_success_message: 1,
  website_heading: 1,
  website_body: 1,
  website_meta_title: 1,
  website_meta_description: 1,
  // Special — 2 credits
  extract_order: 2,
  // Medium — 3 credits
  generate_email: 3,
  generate_blog_post: 3,
  compose_contact_email: 3,
  // Heavy — 5 credits
  generate_automation: 5,
  refine_automation: 5,
  plan_campaign: 5,
  plan_social: 5,
  plan_automation: 5,
  plan_ideas: 5,
};

export function getAiCreditCost(actionType: AiActionType): number {
  return AI_CREDIT_COSTS[actionType];
}

export const AI_ACTION_LABELS: Record<AiActionType, string> = {
  email_subject: "Email Subject",
  email_preview: "Email Preview",
  email_body: "Email Body",
  social_caption: "Social Caption",
  product_name: "Product Name",
  product_description: "Product Description",
  product_meta_description: "Product Meta Description",
  discount_description: "Discount Description",
  form_description: "Form Description",
  form_success_message: "Form Success Message",
  website_heading: "Website Heading",
  website_body: "Website Body",
  website_meta_title: "Website Meta Title",
  website_meta_description: "Website Meta Description",
  extract_order: "Order Extraction",
  generate_email: "Email Generation",
  generate_blog_post: "Blog Post",
  compose_contact_email: "Contact Email",
  generate_automation: "Automation Generation",
  refine_automation: "Automation Refinement",
  plan_campaign: "Campaign Plan",
  plan_social: "Social Plan",
  plan_automation: "Automation Plan",
  plan_ideas: "Ideas Plan",
};
