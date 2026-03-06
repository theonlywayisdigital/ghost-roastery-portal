import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roaster = user.roaster;
  if (!roaster) {
    return NextResponse.json({ error: "No roaster found" }, { status: 400 });
  }

  const stripeCustomerId = roaster.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found. Subscribe to a plan first." },
      { status: 400 }
    );
  }

  try {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${portalUrl}/settings/billing?tab=subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
