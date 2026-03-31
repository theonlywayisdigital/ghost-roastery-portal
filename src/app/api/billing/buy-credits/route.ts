import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { getCreditPackById } from "@/lib/tier-config";

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
  const { packId } = body as { packId: string };

  const pack = getCreditPackById(packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
  }

  if (!pack.stripePriceId || pack.stripePriceId === "REPLACE_ME") {
    return NextResponse.json({ error: "Credit packs not yet configured" }, { status: 503 });
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

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "payment",
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      success_url: `${portalUrl}/settings/billing?tab=subscription&credits=success`,
      cancel_url: `${portalUrl}/settings/billing?tab=subscription&credits=cancel`,
      metadata: {
        roaster_id: roaster.id as string,
        type: "credit_purchase",
        pack_id: pack.id,
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Credit purchase checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
