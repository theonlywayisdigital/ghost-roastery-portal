import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { type TierLevel, getEffectivePlatformFee, getStripePriceId } from "@/lib/tier-config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Get roaster
  const { data: roaster, error } = await supabase
    .from("partner_roasters")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !roaster) {
    return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
  }

  // Fetch stats in parallel
  const [teamResult, productResult, orderResult, contactResult, formResult, wholesaleAccessResult] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("wholesale_orders")
      .select("subtotal")
      .eq("roaster_id", id),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("forms")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("wholesale_access")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id)
      .eq("status", "approved"),
  ]);

  const teamCount = teamResult.count || 0;
  const productCount = productResult.count || 0;
  const contactCount = contactResult.count || 0;
  const formCount = formResult.count || 0;
  const wholesaleAccountCount = wholesaleAccessResult.count || 0;

  const orders = orderResult.data || [];
  const orderCount = orders.length;
  const revenue = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

  // Build usage data using tier config
  const salesTier = (roaster.sales_tier as TierLevel) || "free";
  const marketingTier = (roaster.marketing_tier as TierLevel) || "free";
  const { getEffectiveLimits } = await import("@/lib/tier-config");
  const limits = getEffectiveLimits(salesTier, marketingTier);

  // Helper: build usage entry with JSON-safe limit (-1 for Infinity)
  const usageEntry = (current: number, limit: number) => ({
    current,
    limit: limit === Infinity ? -1 : limit,
    percentUsed: limit === Infinity ? 0 : Math.min(Math.round((current / limit) * 100), 100),
  });

  const usage: Record<string, { current: number; limit: number; percentUsed: number }> = {
    products: usageEntry(productCount, limits.products),
    wholesaleAccounts: usageEntry(wholesaleAccountCount, limits.wholesaleAccounts),
    wholesaleOrdersPerMonth: usageEntry((roaster.monthly_wholesale_orders_count as number) || 0, limits.wholesaleOrdersPerMonth),
    crmContacts: usageEntry(contactCount, limits.crmContacts),
    teamMembers: usageEntry(teamCount, limits.teamMembers),
    emailSendsPerMonth: usageEntry((roaster.monthly_emails_sent as number) || 0, limits.emailSendsPerMonth),
    embeddedForms: usageEntry(formCount, limits.embeddedForms),
    aiCreditsPerMonth: usageEntry((roaster.monthly_ai_credits_used as number) || 0, limits.aiCreditsPerMonth),
  };

  return NextResponse.json({
    roaster,
    stats: {
      teamCount,
      productCount,
      orderCount,
      revenue,
    },
    usage,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify roaster exists
    const { data: existing } = await supabase
      .from("partner_roasters")
      .select("id, is_active, sales_tier, marketing_tier")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
    }

    const allowedFields = [
      "business_name", "contact_name", "email", "phone", "website", "country",
      "address_line1", "address_line2", "city", "postcode",
      "is_active", "is_ghost_roaster", "ghost_roaster_application_status",
      "platform_fee_percent", "wholesale_enabled", "notes",
      "storefront_enabled", "auto_approve_wholesale",
      "sales_tier", "marketing_tier", "tier_override_reason",
      "sales_discount_percent", "marketing_discount_percent", "discount_note",
      "website_subscription_active", "website_discount_percent",
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const changes: string[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
        changes.push(field);
      }
    }

    if (changes.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // If tier is being changed, add metadata
    const tierChanged = changes.includes("sales_tier") || changes.includes("marketing_tier");
    if (tierChanged) {
      updates.tier_changed_at = new Date().toISOString();
      updates.tier_override_by = user.id;
      // Update platform_fee_percent based on new sales tier
      if (body.sales_tier) {
        updates.platform_fee_percent = getEffectivePlatformFee((body.sales_tier as TierLevel) || "free");
      }
    }

    // Sync Stripe subscriptions when admin changes tier
    if (tierChanged) {
      // Fetch full roaster to get subscription IDs
      const { data: fullRoaster } = await supabase
        .from("partner_roasters")
        .select("stripe_sales_subscription_id, stripe_marketing_subscription_id, sales_billing_cycle, marketing_billing_cycle")
        .eq("id", id)
        .single();

      if (fullRoaster) {
        // Sales tier changed
        if (changes.includes("sales_tier") && fullRoaster.stripe_sales_subscription_id) {
          const newSalesTier = body.sales_tier as TierLevel;
          if (newSalesTier === "free") {
            // Cancel Stripe subscription
            try {
              await stripe.subscriptions.cancel(fullRoaster.stripe_sales_subscription_id);
              updates.stripe_sales_subscription_id = null;
              updates.sales_billing_cycle = null;
            } catch (e) {
              console.error("Failed to cancel sales subscription:", e);
            }
          } else {
            // Update to new price
            const cycle = (fullRoaster.sales_billing_cycle || "monthly") as "monthly" | "annual";
            const priceId = getStripePriceId("sales", newSalesTier, cycle);
            if (priceId) {
              try {
                const sub = await stripe.subscriptions.retrieve(fullRoaster.stripe_sales_subscription_id);
                await stripe.subscriptions.update(fullRoaster.stripe_sales_subscription_id, {
                  items: [{ id: sub.items.data[0].id, price: priceId }],
                  metadata: { ...sub.metadata, tier: newSalesTier },
                  proration_behavior: "create_prorations",
                });
              } catch (e) {
                console.error("Failed to update sales subscription:", e);
              }
            }
          }
        }

        // Marketing tier changed
        if (changes.includes("marketing_tier") && fullRoaster.stripe_marketing_subscription_id) {
          const newMarketingTier = body.marketing_tier as TierLevel;
          if (newMarketingTier === "free") {
            try {
              await stripe.subscriptions.cancel(fullRoaster.stripe_marketing_subscription_id);
              updates.stripe_marketing_subscription_id = null;
              updates.marketing_billing_cycle = null;
            } catch (e) {
              console.error("Failed to cancel marketing subscription:", e);
            }
          } else {
            const cycle = (fullRoaster.marketing_billing_cycle || "monthly") as "monthly" | "annual";
            const priceId = getStripePriceId("marketing", newMarketingTier, cycle);
            if (priceId) {
              try {
                const sub = await stripe.subscriptions.retrieve(fullRoaster.stripe_marketing_subscription_id);
                await stripe.subscriptions.update(fullRoaster.stripe_marketing_subscription_id, {
                  items: [{ id: sub.items.data[0].id, price: priceId }],
                  metadata: { ...sub.metadata, tier: newMarketingTier },
                  proration_behavior: "create_prorations",
                });
              } catch (e) {
                console.error("Failed to update marketing subscription:", e);
              }
            }
          }
        }

        // Update subscription_status only if roaster HAD active subscriptions that are now all gone
        const hadAnySub = !!fullRoaster.stripe_sales_subscription_id || !!fullRoaster.stripe_marketing_subscription_id;
        if (hadAnySub) {
          const salesSubRemains = changes.includes("sales_tier") && body.sales_tier === "free"
            ? false
            : !!fullRoaster.stripe_sales_subscription_id;
          const marketingSubRemains = changes.includes("marketing_tier") && body.marketing_tier === "free"
            ? false
            : !!fullRoaster.stripe_marketing_subscription_id;

          if (!salesSubRemains && !marketingSubRemains) {
            updates.subscription_status = "inactive";
          }
        }
      }
    }

    const { error } = await supabase
      .from("partner_roasters")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Admin roaster update error:", error);
      return NextResponse.json(
        { error: "Failed to update roaster" },
        { status: 500 }
      );
    }

    // Log subscription events for tier changes
    if (tierChanged) {
      const eventInserts = [];
      if (changes.includes("sales_tier")) {
        eventInserts.push({
          roaster_id: id,
          event_type: "tier_changed_by_admin",
          previous_tier: existing.sales_tier || "free",
          new_tier: body.sales_tier,
          product_type: "sales",
          metadata: { reason: body.tier_override_reason || null },
          created_by: user.id,
        });
      }
      if (changes.includes("marketing_tier")) {
        eventInserts.push({
          roaster_id: id,
          event_type: "tier_changed_by_admin",
          previous_tier: existing.marketing_tier || "free",
          new_tier: body.marketing_tier,
          product_type: "marketing",
          metadata: { reason: body.tier_override_reason || null },
          created_by: user.id,
        });
      }
      if (eventInserts.length > 0) {
        await supabase.from("subscription_events").insert(eventInserts);
      }
    }

    // Log activity
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: "roaster_updated",
      description: `Updated fields: ${changes.join(", ")}`,
      metadata: { changes: body },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin roaster update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: existing } = await supabase
      .from("partner_roasters")
      .select("id, is_active, business_name")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Roaster not found" }, { status: 404 });
    }

    // Soft deactivate
    const { error } = await supabase
      .from("partner_roasters")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Admin roaster deactivate error:", error);
      return NextResponse.json(
        { error: "Failed to deactivate roaster" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: "roaster_deactivated",
      description: `Roaster "${existing.business_name}" deactivated by admin`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin roaster deactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
