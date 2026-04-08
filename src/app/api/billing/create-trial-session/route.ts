import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { getStripePriceId, type TierLevel, type BillingCycle } from "@/lib/tier-config";

export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  if (!roaster) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  // If already has an active sales subscription, block
  if (roaster.stripe_sales_subscription_id) {
    return NextResponse.json(
      { error: "You already have an active subscription", redirect: "/settings/billing?tab=subscription" },
      { status: 409 }
    );
  }

  let billingCycle: BillingCycle = "monthly";
  let salesTier: TierLevel = "growth";
  let marketingTier: TierLevel | null = null;

  try {
    const body = await request.json();
    if (body.billingCycle === "annual") billingCycle = "annual";
    if (body.salesTier === "pro") salesTier = "pro";
    if (body.salesTier === "scale") salesTier = "scale";
    if (body.marketingTier === "growth" || body.marketingTier === "pro" || body.marketingTier === "scale") {
      marketingTier = body.marketingTier;
    }
  } catch {
    // No body or invalid JSON — defaults apply
  }

  // Only Growth gets a trial, and only if not already used
  const isTrialEligible = salesTier === "growth" && !roaster.trial_used;

  // Block Growth trial if already used
  if (salesTier === "growth" && roaster.trial_used) {
    return NextResponse.json(
      { error: "Trial already used", redirect: "/settings/billing?tab=subscription" },
      { status: 409 }
    );
  }

  const supabase = createServerClient();
  const priceId = getStripePriceId("sales", salesTier, billingCycle);
  if (!priceId) {
    return NextResponse.json({ error: "Price configuration error" }, { status: 500 });
  }

  try {
    // Ensure Stripe Customer exists
    let stripeCustomerId = roaster.stripe_customer_id as string | null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (roaster.billing_email as string) || (roaster.email as string),
        name: roaster.business_name as string,
        metadata: {
          roaster_id: roaster.id as string,
          portal_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from("roasters")
        .update({ stripe_customer_id: customer.id })
        .eq("id", roaster.id);
    }

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";

    // Build session metadata — includes marketing info for webhook to pick up
    const sessionMetadata: Record<string, string> = {
      roaster_id: roaster.id as string,
      product_type: "sales",
      tier: salesTier,
      billing_cycle: billingCycle,
      is_trial: isTrialEligible ? "true" : "false",
    };

    if (marketingTier) {
      sessionMetadata.marketing_tier = marketingTier;
      sessionMetadata.marketing_billing_cycle = billingCycle;
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(isTrialEligible ? { trial_period_days: 14 } : {}),
        metadata: {
          roaster_id: roaster.id as string,
          product_type: "sales",
          tier: salesTier,
          billing_cycle: billingCycle,
          is_trial: isTrialEligible ? "true" : "false",
        },
      },
      success_url: `${portalUrl}/dashboard?trial=started`,
      cancel_url: `${portalUrl}/start-trial?cancelled=true`,
      metadata: sessionMetadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const stripeError = error as { type?: string; message?: string; code?: string; statusCode?: number };
    console.error("Trial checkout session error:", JSON.stringify({
      type: stripeError.type,
      message: stripeError.message,
      code: stripeError.code,
      statusCode: stripeError.statusCode,
    }));
    return NextResponse.json(
      { error: stripeError.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
