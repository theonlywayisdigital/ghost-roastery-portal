import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { getEffectivePlatformFee } from "@/lib/tier-config";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Find roasters whose grace period has expired
  const { data: expiredRoasters, error } = await supabase
    .from("roasters")
    .select("id, stripe_sales_subscription_id, stripe_marketing_subscription_id, sales_tier, marketing_tier")
    .eq("subscription_status", "past_due")
    .lt("grace_period_expires_at", now);

  if (error) {
    console.error("Grace period check error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!expiredRoasters || expiredRoasters.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const roaster of expiredRoasters) {
    try {
      // Cancel Stripe subscriptions
      if (roaster.stripe_sales_subscription_id) {
        try {
          await stripe.subscriptions.cancel(roaster.stripe_sales_subscription_id);
        } catch (e) {
          console.error(`Failed to cancel sales sub for roaster ${roaster.id}:`, e);
        }
      }

      if (roaster.stripe_marketing_subscription_id) {
        try {
          await stripe.subscriptions.cancel(roaster.stripe_marketing_subscription_id);
        } catch (e) {
          console.error(`Failed to cancel marketing sub for roaster ${roaster.id}:`, e);
        }
      }

      // Downgrade to free
      await supabase
        .from("roasters")
        .update({
          sales_tier: "free",
          marketing_tier: "free",
          stripe_sales_subscription_id: null,
          stripe_marketing_subscription_id: null,
          sales_billing_cycle: null,
          marketing_billing_cycle: null,
          subscription_status: "inactive",
          subscription_past_due_since: null,
          grace_period_expires_at: null,
          tier_changed_at: now,
          tier_override_by: null,
          platform_fee_percent: getEffectivePlatformFee("free"),
          updated_at: now,
        })
        .eq("id", roaster.id);

      // Log events
      const events = [];
      if (roaster.sales_tier !== "free") {
        events.push({
          roaster_id: roaster.id,
          event_type: "grace_period_expired",
          product_type: "sales",
          previous_tier: roaster.sales_tier,
          new_tier: "free",
          metadata: { reason: "Grace period expired after payment failure" },
        });
      }
      if (roaster.marketing_tier !== "free") {
        events.push({
          roaster_id: roaster.id,
          event_type: "grace_period_expired",
          product_type: "marketing",
          previous_tier: roaster.marketing_tier,
          new_tier: "free",
          metadata: { reason: "Grace period expired after payment failure" },
        });
      }
      if (events.length > 0) {
        await supabase.from("subscription_events").insert(events);
      }

      processed++;
    } catch (e) {
      console.error(`Failed to process roaster ${roaster.id}:`, e);
    }
  }

  return NextResponse.json({ processed, total: expiredRoasters.length });
}
