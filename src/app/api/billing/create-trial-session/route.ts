import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { getStripePriceId } from "@/lib/tier-config";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  if (!roaster) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  // Prevent repeat trials
  if (roaster.trial_used) {
    return NextResponse.json(
      { error: "Trial already used", redirect: "/settings/billing?tab=subscription" },
      { status: 409 }
    );
  }

  const supabase = createServerClient();
  const priceId = getStripePriceId("sales", "growth", "monthly");
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

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          roaster_id: roaster.id as string,
          product_type: "sales",
          tier: "growth",
          billing_cycle: "monthly",
          is_trial: "true",
        },
      },
      success_url: `${portalUrl}/dashboard?trial=started`,
      cancel_url: `${portalUrl}/start-trial?cancelled=true`,
      metadata: {
        roaster_id: roaster.id as string,
        product_type: "sales",
        tier: "growth",
        billing_cycle: "monthly",
        is_trial: "true",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Trial checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create trial checkout session" },
      { status: 500 }
    );
  }
}
