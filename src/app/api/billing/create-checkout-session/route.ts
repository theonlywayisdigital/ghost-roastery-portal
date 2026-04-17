import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import {
  type TierLevel,
  type ProductType,
  type BillingCycle,
  getStripePriceId,
  getTierFromPriceId,
} from "@/lib/tier-config";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  if (!roaster) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  const body = await request.json();
  const { productType, tier, billingCycle } = body as {
    productType: ProductType;
    tier: TierLevel;
    billingCycle: BillingCycle;
  };

  if (!productType || !billingCycle) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Website subscriptions are not currently available
  if (productType === "website") {
    return NextResponse.json({ error: "Website subscriptions are not currently available" }, { status: 400 });
  }

  if (!tier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const priceId = getStripePriceId(productType, tier, billingCycle);
  if (!priceId) {
    return NextResponse.json({ error: "Invalid tier or billing cycle" }, { status: 400 });
  }

  const supabase = createServerClient();

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

    // Check for existing subscription for this product
    const subscriptionIdField = productType === "sales"
      ? "stripe_sales_subscription_id"
      : "stripe_marketing_subscription_id";
    const existingSubscriptionId = roaster[subscriptionIdField] as string | null;

    if (existingSubscriptionId) {
      // Update existing subscription (mid-cycle upgrade/downgrade)
      const subscription = await stripe.subscriptions.retrieve(existingSubscriptionId);
      if (subscription.status === "canceled") {
        // Subscription is canceled, create new checkout
        return await createCheckoutSession(stripeCustomerId, priceId, roaster.id as string, productType, tier, billingCycle);
      }

      // Find the subscription item that matches this product type
      const matchingItem = subscription.items.data.find((item) => {
        const tierInfo = getTierFromPriceId(item.price.id);
        return tierInfo && tierInfo.product === productType;
      });

      if (matchingItem) {
        // Update the existing item for this product type
        await stripe.subscriptions.update(existingSubscriptionId, {
          items: [{ id: matchingItem.id, price: priceId }],
          metadata: {
            roaster_id: roaster.id as string,
            product_type: productType,
            tier,
            billing_cycle: billingCycle,
          },
          proration_behavior: "create_prorations",
        });
      } else {
        // No item for this product type on the subscription — add a new line item
        await stripe.subscriptions.update(existingSubscriptionId, {
          items: [{ price: priceId }],
          metadata: {
            roaster_id: roaster.id as string,
            product_type: productType,
            tier,
            billing_cycle: billingCycle,
          },
          proration_behavior: "create_prorations",
        });
      }

      return NextResponse.json({ success: true, action: "updated" });
    }

    // No existing subscription — create Checkout Session
    return await createCheckoutSession(stripeCustomerId, priceId, roaster.id as string, productType, tier, billingCycle);
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

async function createCheckoutSession(
  customerId: string,
  priceId: string,
  roasterId: string,
  productType: ProductType,
  tier: TierLevel,
  billingCycle: BillingCycle
) {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        roaster_id: roasterId,
        product_type: productType,
        tier,
        billing_cycle: billingCycle,
      },
    },
    success_url: `${portalUrl}/settings/billing?tab=subscription&checkout=success`,
    cancel_url: `${portalUrl}/settings/billing?tab=subscription&checkout=cancel`,
    metadata: {
      roaster_id: roasterId,
      product_type: productType,
      tier,
      billing_cycle: billingCycle,
    },
  });

  return NextResponse.json({ url: session.url, action: "checkout" });
}
