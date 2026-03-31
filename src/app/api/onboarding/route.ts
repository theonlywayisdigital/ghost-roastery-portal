import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import {
  ONBOARDING_STEPS,
  type OnboardingResponse,
  type OnboardingState,
  type OnboardingStepStatus,
} from "@/lib/onboarding";
import {
  getEffectiveFeatures,
  getMinimumTierForFeature,
  TIER_NAMES,
  type TierLevel,
} from "@/lib/tier-config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("roaster") || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  const roasterId = roaster.id;
  const salesTier = ((roaster as Record<string, unknown>).sales_tier as TierLevel) || "free";
  const marketingTier = ((roaster as Record<string, unknown>).marketing_tier as TierLevel) || "free";

  const supabase = createServerClient();

  // Parallel count queries
  const [productsRes, contactsRes, socialRes, integrationsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId),
    supabase
      .from("social_connections")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId)
      .eq("status", "active"),
    supabase
      .from("roaster_integrations")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId)
      .eq("is_active", true),
  ]);

  const productCount = productsRes.count ?? 0;
  const contactCount = contactsRes.count ?? 0;
  const socialCount = socialRes.count ?? 0;
  const integrationCount = integrationsRes.count ?? 0;

  // Completion checks keyed by step key
  const completionMap: Record<string, boolean> = {
    logo: !!(roaster as Record<string, unknown>).brand_logo_url,
    product: productCount > 0,
    domain: !!(roaster as Record<string, unknown>).storefront_slug,
    stripe: !!roaster.stripe_account_id,
    contacts: contactCount > 0,
    social: socialCount > 0,
    wholesale: !!(roaster as Record<string, unknown>).storefront_setup_complete,
    integrations: integrationCount > 0,
  };

  // Feature gating
  const features = getEffectiveFeatures(salesTier, marketingTier);

  const steps: OnboardingStepStatus[] = ONBOARDING_STEPS.map((step) => {
    let gated: OnboardingStepStatus["gated"] = false;

    if (step.gatedFeature && !features[step.gatedFeature]) {
      const min = getMinimumTierForFeature(step.gatedFeature);
      gated = {
        feature: step.gatedFeature,
        requiredTier: min.tier,
        product: min.product,
      };
    }

    return {
      ...step,
      completed: completionMap[step.key] ?? false,
      gated,
    };
  });

  // Parse onboarding_state
  const rawState = (roaster as Record<string, unknown>).onboarding_state;
  const state: OnboardingState =
    rawState && typeof rawState === "object"
      ? (rawState as OnboardingState)
      : { dismissed: false, dismissed_at: null };

  const completedCount = steps.filter((s) => s.completed).length;

  const response: OnboardingResponse = {
    steps,
    dismissed: state.dismissed,
    completedCount,
    totalCount: steps.length,
    welcome_seen: !!state.welcome_seen,
  };

  return NextResponse.json(response);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("roaster") || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const supabase = createServerClient();

    // Read existing state so we can merge
    const rawState = (user.roaster as Record<string, unknown>).onboarding_state;
    const existing: OnboardingState =
      rawState && typeof rawState === "object"
        ? (rawState as OnboardingState)
        : { dismissed: false, dismissed_at: null };

    const state: OnboardingState = { ...existing };

    if (body.dismissed !== undefined) {
      state.dismissed = !!body.dismissed;
      state.dismissed_at = state.dismissed ? new Date().toISOString() : null;
    }

    if (body.welcome_seen !== undefined) {
      state.welcome_seen = !!body.welcome_seen;
    }

    const { error } = await supabase
      .from("roasters")
      .update({ onboarding_state: state })
      .eq("id", user.roaster.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
