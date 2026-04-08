import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { getTierFromPriceId, getEffectivePlatformFee, getStripePriceId } from "@/lib/tier-config";
import type { TierLevel, ProductType, BillingCycle } from "@/lib/tier-config";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Idempotency check
  const { data: existingEvent } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase, event.id);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase, event.id);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase, event.id);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase, event.id);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase, event.id);
        break;

      default:
        // Unhandled event type
        break;
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── checkout.session.completed ───

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createServerClient>,
  eventId: string
) {
  const roasterId = session.metadata?.roaster_id;

  // Handle credit purchase (one-time payment)
  if (session.metadata?.type === "credit_purchase") {
    if (!roasterId) return;
    const credits = Number(session.metadata.credits) || 0;
    const packId = session.metadata.pack_id;
    if (credits <= 0) return;

    // Get current balance
    const { data: roaster } = await supabase
      .from("roasters")
      .select("ai_credits_topup_balance")
      .eq("id", roasterId)
      .single();

    const currentBalance = ((roaster?.ai_credits_topup_balance as number) || 0);
    const newBalance = currentBalance + credits;

    await supabase
      .from("roasters")
      .update({
        ai_credits_topup_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roasterId);

    await supabase.from("ai_credit_ledger").insert({
      roaster_id: roasterId,
      credits_used: -credits, // negative = credits added
      action_type: "credit_purchase",
      source: "topup_purchase",
      reason: `Purchased ${credits} credits (${packId})`,
      metadata: { pack_id: packId, stripe_session_id: session.id },
    });

    await supabase.from("subscription_events").insert({
      roaster_id: roasterId,
      stripe_event_id: eventId,
      event_type: "credit_purchase",
      metadata: { pack_id: packId, credits, session_id: session.id },
    });

    return;
  }

  // Handle subscription checkout
  const productType = session.metadata?.product_type as ProductType | undefined;
  const tier = session.metadata?.tier as TierLevel | undefined;
  const billingCycle = session.metadata?.billing_cycle;

  // Website doesn't require tier
  if (!roasterId || !productType || (productType !== "website" && !tier)) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const subscriptionId = session.subscription as string;

  // Retrieve the full subscription to check trial status
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const isTrial = subscription.status === "trialing";

  const updates: Record<string, unknown> = {
    subscription_status: isTrial ? "trialing" : "active",
    updated_at: new Date().toISOString(),
  };

  // Set trial fields if this is a trial subscription
  if (isTrial) {
    updates.trial_started_at = new Date().toISOString();
    updates.trial_ends_at = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
    updates.trial_used = true;
  }

  if (productType === "website") {
    updates.website_subscription_active = true;
    updates.stripe_website_subscription_id = subscriptionId;
    updates.website_billing_cycle = billingCycle;
  } else if (productType === "sales") {
    updates.sales_tier = tier;
    updates.stripe_sales_subscription_id = subscriptionId;
    updates.sales_billing_cycle = billingCycle;
    updates.platform_fee_percent = getEffectivePlatformFee(tier as TierLevel);
  } else {
    updates.marketing_tier = tier;
    updates.stripe_marketing_subscription_id = subscriptionId;
    updates.marketing_billing_cycle = billingCycle;
  }

  updates.tier_changed_at = new Date().toISOString();
  updates.tier_override_by = null; // Self-service, clear admin override

  await supabase
    .from("roasters")
    .update(updates)
    .eq("id", roasterId);

  await supabase.from("subscription_events").insert({
    roaster_id: roasterId,
    stripe_event_id: eventId,
    event_type: "checkout_completed",
    product_type: productType,
    new_tier: tier || null,
    metadata: { subscription_id: subscriptionId, billing_cycle: billingCycle, is_trial: isTrial },
  });

  // Handle piggy-backed Marketing subscription from wizard flow
  const marketingTier = session.metadata?.marketing_tier as TierLevel | undefined;
  const marketingBillingCycle = (session.metadata?.marketing_billing_cycle || billingCycle) as BillingCycle;

  if (marketingTier && productType === "sales") {
    const marketingPriceId = getStripePriceId("marketing", marketingTier, marketingBillingCycle);
    if (marketingPriceId) {
      try {
        const customerId = session.customer as string;
        const marketingSub = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: marketingPriceId }],
          metadata: {
            roaster_id: roasterId,
            product_type: "marketing",
            tier: marketingTier,
            billing_cycle: marketingBillingCycle,
          },
        });

        await supabase
          .from("roasters")
          .update({
            marketing_tier: marketingTier,
            stripe_marketing_subscription_id: marketingSub.id,
            marketing_billing_cycle: marketingBillingCycle,
          })
          .eq("id", roasterId);

        await supabase.from("subscription_events").insert({
          roaster_id: roasterId,
          stripe_event_id: `${eventId}_marketing`,
          event_type: "checkout_completed",
          product_type: "marketing",
          new_tier: marketingTier,
          metadata: {
            subscription_id: marketingSub.id,
            billing_cycle: marketingBillingCycle,
            created_via: "wizard_piggyback",
          },
        });
      } catch (err) {
        console.error("Failed to create marketing subscription from wizard:", err);
        // Non-fatal — user can add marketing later from billing page
      }
    }
  }

  // Scaffold default website pages on first website subscription
  if (productType === "website") {
    await scaffoldDefaultWebsitePages(roasterId, supabase);
  }
}

// ─── Scaffold default website pages ───

async function scaffoldDefaultWebsitePages(
  roasterId: string,
  supabase: ReturnType<typeof createServerClient>
) {
  // Get or create the website record
  let { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("roaster_id", roasterId)
    .single();

  if (!website) {
    // Get roaster info for website name
    const { data: roaster } = await supabase
      .from("roasters")
      .select("business_name, storefront_slug, website_template")
      .eq("id", roasterId)
      .single();

    const { data: newWebsite } = await supabase
      .from("websites")
      .insert({
        roaster_id: roasterId,
        name: roaster?.business_name || "My Website",
        subdomain: roaster?.storefront_slug || undefined,
        template_id: roaster?.website_template || "modern-minimal",
      })
      .select("id")
      .single();

    website = newWebsite;
  }

  if (!website) return;

  // Check if pages already exist (idempotent)
  const { count } = await supabase
    .from("website_pages")
    .select("*", { count: "exact", head: true })
    .eq("website_id", website.id);

  if (count && count > 0) return;

  // Get roaster's template preference
  const { data: roaster } = await supabase
    .from("roasters")
    .select("website_template")
    .eq("id", roasterId)
    .single();

  const template = roaster?.website_template || "modern-minimal";

  const { getModernMinimalDefaults } = await import("@/lib/website-templates/modern-minimal");
  const { getClassicTraditionalDefaults } = await import("@/lib/website-templates/classic-traditional");

  const templateDefaults =
    template === "classic-traditional"
      ? getClassicTraditionalDefaults()
      : getModernMinimalDefaults();

  const pageConfig = [
    { slug: "home", title: "Home" },
    { slug: "shop", title: "Shop" },
    { slug: "about", title: "About" },
    { slug: "contact", title: "Contact" },
    { slug: "wholesale", title: "Wholesale" },
    { slug: "brewing", title: "Brewing Guide" },
  ];

  const pagesToInsert = pageConfig
    .filter((p) => templateDefaults[p.slug])
    .map((p, i) => ({
      website_id: website.id,
      title: p.title,
      slug: p.slug,
      content: templateDefaults[p.slug] as unknown as Record<string, unknown>,
      sort_order: i,
      is_published: true,
    }));

  await supabase.from("website_pages").insert(pagesToInsert);
}

// ─── customer.subscription.updated ───

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServerClient>,
  eventId: string
) {
  const roasterId = subscription.metadata?.roaster_id;
  const productType = subscription.metadata?.product_type as ProductType | undefined;

  if (!roasterId || !productType) {
    console.error("Missing metadata in subscription:", subscription.id);
    return;
  }

  // Detect price change
  const currentPriceId = subscription.items.data[0]?.price?.id;
  const tierInfo = currentPriceId ? getTierFromPriceId(currentPriceId) : null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (tierInfo) {
    if (productType === "website") {
      updates.website_billing_cycle = tierInfo.billingCycle;
    } else if (productType === "sales") {
      updates.sales_tier = tierInfo.tier;
      updates.sales_billing_cycle = tierInfo.billingCycle;
      updates.platform_fee_percent = getEffectivePlatformFee(tierInfo.tier);
    } else {
      updates.marketing_tier = tierInfo.tier;
      updates.marketing_billing_cycle = tierInfo.billingCycle;
    }
    updates.tier_changed_at = new Date().toISOString();
    updates.tier_override_by = null;
  }

  // Handle subscription status transitions
  if (subscription.cancel_at_period_end) {
    updates.subscription_status = "cancelling";
  } else if (subscription.status === "active") {
    updates.subscription_status = "active";
  } else if (subscription.status === "trialing") {
    updates.subscription_status = "trialing";
  }

  await supabase
    .from("roasters")
    .update(updates)
    .eq("id", roasterId);

  await supabase.from("subscription_events").insert({
    roaster_id: roasterId,
    stripe_event_id: eventId,
    event_type: "subscription_updated",
    product_type: productType,
    new_tier: tierInfo?.tier || null,
    metadata: {
      subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      billing_cycle: tierInfo?.billingCycle || null,
    },
  });
}

// ─── customer.subscription.deleted ───

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createServerClient>,
  eventId: string
) {
  const roasterId = subscription.metadata?.roaster_id;
  const productType = subscription.metadata?.product_type as ProductType | undefined;

  if (!roasterId || !productType) {
    console.error("Missing metadata in deleted subscription:", subscription.id);
    return;
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    tier_changed_at: new Date().toISOString(),
    tier_override_by: null,
  };

  if (productType === "website") {
    updates.website_subscription_active = false;
    updates.stripe_website_subscription_id = null;
    updates.website_billing_cycle = null;
  } else if (productType === "sales") {
    updates.sales_tier = "growth";
    updates.stripe_sales_subscription_id = null;
    updates.sales_billing_cycle = null;
    updates.platform_fee_percent = getEffectivePlatformFee("growth");
  } else {
    updates.marketing_tier = "growth";
    updates.stripe_marketing_subscription_id = null;
    updates.marketing_billing_cycle = null;
  }

  // Check if ANY subscription still exists
  const { data: roaster } = await supabase
    .from("roasters")
    .select("stripe_sales_subscription_id, stripe_marketing_subscription_id, stripe_website_subscription_id")
    .eq("id", roasterId)
    .single();

  const subFields = ["stripe_sales_subscription_id", "stripe_marketing_subscription_id", "stripe_website_subscription_id"] as const;
  const currentSubField = productType === "sales"
    ? "stripe_sales_subscription_id"
    : productType === "website"
      ? "stripe_website_subscription_id"
      : "stripe_marketing_subscription_id";
  const hasOtherSubscription = subFields.some(
    (f) => f !== currentSubField && roaster?.[f]
  );

  if (!hasOtherSubscription) {
    updates.subscription_status = "inactive";
    updates.stripe_customer_id = null; // allow re-creation if they resubscribe
  }

  await supabase
    .from("roasters")
    .update(updates)
    .eq("id", roasterId);

  await supabase.from("subscription_events").insert({
    roaster_id: roasterId,
    stripe_event_id: eventId,
    event_type: "subscription_deleted",
    product_type: productType,
    previous_tier: subscription.metadata?.tier || null,
    new_tier: "growth",
    metadata: { subscription_id: subscription.id },
  });
}

// ─── Helper: extract subscription ID from invoice ───

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails?.subscription) return null;
  return typeof subDetails.subscription === "string"
    ? subDetails.subscription
    : subDetails.subscription.id;
}

// ─── invoice.paid ───

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createServerClient>,
  eventId: string
) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const roasterId = subscription.metadata?.roaster_id;
  const productType = subscription.metadata?.product_type as ProductType | undefined;

  if (!roasterId) return;

  // Clear past_due state
  await supabase
    .from("roasters")
    .update({
      subscription_status: "active",
      subscription_past_due_since: null,
      grace_period_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roasterId);

  await supabase.from("subscription_events").insert({
    roaster_id: roasterId,
    stripe_event_id: eventId,
    event_type: "invoice_paid",
    product_type: productType || null,
    metadata: { invoice_id: invoice.id },
  });
}

// ─── invoice.payment_failed ───

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createServerClient>,
  eventId: string
) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const roasterId = subscription.metadata?.roaster_id;
  const productType = subscription.metadata?.product_type as ProductType | undefined;

  if (!roasterId) return;

  const now = new Date();
  const gracePeriodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  await supabase
    .from("roasters")
    .update({
      subscription_status: "past_due",
      subscription_past_due_since: now.toISOString(),
      grace_period_expires_at: gracePeriodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", roasterId);

  await supabase.from("subscription_events").insert({
    roaster_id: roasterId,
    stripe_event_id: eventId,
    event_type: "payment_failed",
    product_type: productType || null,
    metadata: {
      invoice_id: invoice.id,
      grace_period_expires_at: gracePeriodEnd.toISOString(),
    },
  });
}
