// ═══════════════════════════════════════════════════════════════
// Feature Gates — Server-side limit & feature enforcement
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase";
import {
  type TierLevel,
  type LimitKey,
  type FeatureKey,
  type ProductType,
  getEffectiveLimits,
  getEffectiveFeatures,
  getEffectivePlatformFee,
  getMinimumTierForFeature,
  LIMIT_LABELS,
  FEATURE_LABELS,
  TIER_NAMES,
  LIMIT_PRODUCT_MAP,
  formatLimit,
} from "@/lib/tier-config";

// ─── Result Types ───

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  warning: boolean;     // true at >=80%
  percentUsed: number;
  message?: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  requiredTier: TierLevel;
  requiredProduct: ProductType;
  message?: string;
}

export interface UsageSummary {
  tiers: { sales: TierLevel; marketing: TierLevel };
  limits: Record<LimitKey, { current: number; limit: number; percentUsed: number; warning: boolean }>;
  features: Record<FeatureKey, boolean>;
  platformFeePercent: number;
}

// ─── Internal: Get roaster tiers ───

interface RoasterTiers {
  id: string;
  sales_tier: TierLevel;
  marketing_tier: TierLevel;
  monthly_wholesale_orders_count: number;
  monthly_wholesale_orders_reset_at: string | null;
  monthly_ai_credits_used: number;
  monthly_ai_credits_reset_at: string | null;
  monthly_emails_sent: number;
  monthly_email_reset_at: string | null;
  ai_credits_topup_balance: number;
}

async function getRoasterTierData(roasterId: string): Promise<RoasterTiers | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("partner_roasters")
    .select(
      "id, sales_tier, marketing_tier, monthly_wholesale_orders_count, monthly_wholesale_orders_reset_at, monthly_ai_credits_used, monthly_ai_credits_reset_at, monthly_emails_sent, monthly_email_reset_at, ai_credits_topup_balance"
    )
    .eq("id", roasterId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    sales_tier: (data.sales_tier as TierLevel) || "free",
    marketing_tier: (data.marketing_tier as TierLevel) || "free",
    monthly_wholesale_orders_count: (data.monthly_wholesale_orders_count as number) || 0,
    monthly_wholesale_orders_reset_at: data.monthly_wholesale_orders_reset_at as string | null,
    monthly_ai_credits_used: (data.monthly_ai_credits_used as number) || 0,
    monthly_ai_credits_reset_at: data.monthly_ai_credits_reset_at as string | null,
    monthly_emails_sent: (data.monthly_emails_sent as number) || 0,
    monthly_email_reset_at: data.monthly_email_reset_at as string | null,
    ai_credits_topup_balance: (data.ai_credits_topup_balance as number) || 0,
  };
}

// ─── Internal: Lazy monthly reset check ───

function isNewMonth(resetAt: string | null): boolean {
  if (!resetAt) return true;
  const resetDate = new Date(resetAt);
  const now = new Date();
  return resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear();
}

// ─── Internal: Count functions ───

async function getCount(table: string, column: string, value: string, extraFilter?: { column: string; value: string }): Promise<number> {
  const supabase = createServerClient();
  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (extraFilter) {
    query = query.eq(extraFilter.column, extraFilter.value);
  }

  const { count } = await query;
  return count || 0;
}

async function getCurrentCount(roasterId: string, limitKey: LimitKey, roasterData: RoasterTiers): Promise<number> {
  switch (limitKey) {
    case "products":
      return getCount("products", "roaster_id", roasterId);

    case "wholesaleOrdersPerMonth":
      if (isNewMonth(roasterData.monthly_wholesale_orders_reset_at)) {
        // Reset counter lazily
        const supabase = createServerClient();
        await supabase
          .from("partner_roasters")
          .update({ monthly_wholesale_orders_count: 0, monthly_wholesale_orders_reset_at: new Date().toISOString() })
          .eq("id", roasterId);
        return 0;
      }
      return roasterData.monthly_wholesale_orders_count;

    case "wholesaleAccounts":
      return getCount("wholesale_access", "roaster_id", roasterId, { column: "status", value: "approved" });

    case "crmContacts":
      return getCount("contacts", "roaster_id", roasterId);

    case "teamMembers":
      return getCount("team_members", "roaster_id", roasterId);

    case "emailSendsPerMonth":
      if (isNewMonth(roasterData.monthly_email_reset_at)) {
        const supabase = createServerClient();
        await supabase
          .from("partner_roasters")
          .update({ monthly_emails_sent: 0, monthly_email_reset_at: new Date().toISOString() })
          .eq("id", roasterId);
        return 0;
      }
      return roasterData.monthly_emails_sent;

    case "embeddedForms":
      return getCount("forms", "roaster_id", roasterId);

    case "aiCreditsPerMonth":
      if (isNewMonth(roasterData.monthly_ai_credits_reset_at)) {
        const supabase = createServerClient();
        await supabase
          .from("partner_roasters")
          .update({ monthly_ai_credits_used: 0, monthly_ai_credits_reset_at: new Date().toISOString() })
          .eq("id", roasterId);
        return 0;
      }
      return roasterData.monthly_ai_credits_used;

    // Tools limits
    case "greenBeans":
      return getCount("green_beans", "roaster_id", roasterId);

    case "roastedStock":
      return getCount("roasted_stock", "roaster_id", roasterId);

    case "roastLogsPerMonth": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const supabase = createServerClient();
      const { count } = await supabase
        .from("roast_logs")
        .select("*", { count: "exact", head: true })
        .eq("roaster_id", roasterId)
        .gte("created_at", startOfMonth.toISOString());
      return count || 0;
    }

    case "cuppingSessionsPerMonth": {
      const startOfMonth2 = new Date();
      startOfMonth2.setDate(1);
      startOfMonth2.setHours(0, 0, 0, 0);
      const supabase = createServerClient();
      const { count } = await supabase
        .from("cupping_sessions")
        .select("*", { count: "exact", head: true })
        .eq("roaster_id", roasterId)
        .gte("created_at", startOfMonth2.toISOString());
      return count || 0;
    }

    case "certifications":
      return getCount("certifications", "roaster_id", roasterId);
  }
}

// ─── checkLimit ───

export async function checkLimit(
  roasterId: string,
  limitKey: LimitKey,
  incrementBy: number = 0
): Promise<LimitCheckResult> {
  const roasterData = await getRoasterTierData(roasterId);
  if (!roasterData) {
    return { allowed: false, current: 0, limit: 0, warning: false, percentUsed: 0, message: "Roaster not found" };
  }

  const limits = getEffectiveLimits(roasterData.sales_tier, roasterData.marketing_tier);
  const limit = limits[limitKey];
  const current = await getCurrentCount(roasterId, limitKey, roasterData);
  const afterIncrement = current + incrementBy;

  if (limit === Infinity) {
    return { allowed: true, current, limit, warning: false, percentUsed: 0 };
  }

  // For AI credits: if monthly limit exceeded, allow if top-up balance covers the overflow
  if (limitKey === "aiCreditsPerMonth" && afterIncrement > limit) {
    const overflow = afterIncrement - limit;
    if (roasterData.ai_credits_topup_balance >= overflow) {
      const percentUsed = 100; // monthly allocation fully consumed
      return {
        allowed: true,
        current,
        limit,
        warning: true,
        percentUsed,
        message: `Monthly AI credits exhausted. Using top-up balance (${roasterData.ai_credits_topup_balance} remaining).`,
      };
    }
  }

  const percentUsed = Math.round((afterIncrement / limit) * 100);
  const warning = percentUsed >= 80;
  const allowed = afterIncrement <= limit;

  const label = LIMIT_LABELS[limitKey];
  const product = LIMIT_PRODUCT_MAP[limitKey];

  return {
    allowed,
    current,
    limit,
    warning,
    percentUsed: Math.min(percentUsed, 100),
    message: allowed
      ? warning
        ? `You're approaching your ${label} limit (${current}/${formatLimit(limit)}).`
        : undefined
      : `${label} limit reached (${current}/${formatLimit(limit)}). Upgrade your ${product === "sales" ? "Sales Suite" : "Marketing Suite"} plan to continue.`,
  };
}

// ─── checkWebsiteAccess ───

export async function checkWebsiteAccess(roasterId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("partner_roasters")
    .select("website_subscription_active")
    .eq("id", roasterId)
    .single();

  return data?.website_subscription_active === true;
}

// ─── checkFeature ───

export async function checkFeature(
  roasterId: string,
  featureKey: FeatureKey
): Promise<FeatureCheckResult> {
  const roasterData = await getRoasterTierData(roasterId);
  if (!roasterData) {
    return { allowed: false, requiredTier: "growth", requiredProduct: "sales", message: "Roaster not found" };
  }

  const features = getEffectiveFeatures(roasterData.sales_tier, roasterData.marketing_tier);
  const allowed = features[featureKey];

  if (allowed) {
    return { allowed: true, requiredTier: roasterData.sales_tier, requiredProduct: "sales" };
  }

  const { tier, product } = getMinimumTierForFeature(featureKey);
  const label = FEATURE_LABELS[featureKey];

  return {
    allowed: false,
    requiredTier: tier,
    requiredProduct: product,
    message: `${label} requires the ${TIER_NAMES[tier]} plan (${product === "sales" ? "Sales Suite" : "Marketing Suite"}). Upgrade to unlock this feature.`,
  };
}

// ─── getRoasterUsageSummary ───

export async function getRoasterUsageSummary(roasterId: string): Promise<UsageSummary | null> {
  const roasterData = await getRoasterTierData(roasterId);
  if (!roasterData) return null;

  const effectiveLimits = getEffectiveLimits(roasterData.sales_tier, roasterData.marketing_tier);
  const effectiveFeatures = getEffectiveFeatures(roasterData.sales_tier, roasterData.marketing_tier);
  const platformFeePercent = getEffectivePlatformFee(roasterData.sales_tier);

  // Run all count queries in parallel
  const limitKeys: LimitKey[] = [
    "products", "wholesaleOrdersPerMonth", "wholesaleAccounts",
    "crmContacts", "teamMembers", "emailSendsPerMonth",
    "embeddedForms", "aiCreditsPerMonth",
    "greenBeans", "roastedStock", "roastLogsPerMonth",
    "cuppingSessionsPerMonth", "certifications",
  ];

  const counts = await Promise.all(
    limitKeys.map((key) => getCurrentCount(roasterId, key, roasterData))
  );

  const limits = {} as Record<LimitKey, { current: number; limit: number; percentUsed: number; warning: boolean }>;
  for (let i = 0; i < limitKeys.length; i++) {
    const key = limitKeys[i];
    const current = counts[i];
    const limit = effectiveLimits[key];
    const percentUsed = limit === Infinity ? 0 : Math.min(Math.round((current / limit) * 100), 100);
    limits[key] = {
      current,
      limit,
      percentUsed,
      warning: percentUsed >= 80,
    };
  }

  return {
    tiers: { sales: roasterData.sales_tier, marketing: roasterData.marketing_tier },
    limits,
    features: effectiveFeatures,
    platformFeePercent,
  };
}
