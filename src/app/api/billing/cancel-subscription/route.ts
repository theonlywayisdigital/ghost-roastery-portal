import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import type { ProductType } from "@/lib/tier-config";

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
  const { productType } = body as { productType: ProductType };

  if (!productType) {
    return NextResponse.json({ error: "Missing productType" }, { status: 400 });
  }

  const subscriptionIdField = productType === "sales"
    ? "stripe_sales_subscription_id"
    : productType === "website"
      ? "stripe_website_subscription_id"
      : "stripe_marketing_subscription_id";
  const subscriptionId = roaster[subscriptionIdField] as string | null;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "No active subscription for this product" },
      { status: 400 }
    );
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update subscription status in DB
    const supabase = createServerClient();
    await supabase
      .from("partner_roasters")
      .update({ subscription_status: "cancelling" })
      .eq("id", roaster.id);

    // Log event
    await supabase.from("subscription_events").insert({
      roaster_id: roaster.id as string,
      event_type: "subscription_cancel_requested",
      product_type: productType,
      metadata: { cancelled_by: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
