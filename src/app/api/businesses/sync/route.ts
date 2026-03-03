import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  let synced = 0;

  // 1. Sync from wholesale_access — create businesses from business_name
  const { data: wholesaleBuyers } = await supabase
    .from("wholesale_access")
    .select("id, user_id, business_name, status, business_type, business_address, business_website")
    .eq("roaster_id", roaster.id)
    .is("business_id", null);

  for (const buyer of wholesaleBuyers || []) {
    if (!buyer.business_name) continue;

    const bizName = buyer.business_name.trim();

    // Check if business already exists
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("roaster_id", roaster.id)
      .ilike("name", bizName)
      .single();

    if (existing) {
      // Link wholesale_access to existing business
      await supabase
        .from("wholesale_access")
        .update({ business_id: existing.id })
        .eq("id", buyer.id);

      // Also link any contacts with this wholesale buyer
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", roaster.id)
        .eq("user_id", buyer.user_id)
        .is("business_id", null);

      for (const contact of contacts || []) {
        await supabase
          .from("contacts")
          .update({ business_id: existing.id })
          .eq("id", contact.id);
      }
    } else {
      // Create new business
      // Map wholesale business_type to industry
      const industryMap: Record<string, string> = {
        cafe: "cafe",
        restaurant: "restaurant",
        office: "office",
        hotel: "hotel",
        retailer: "retail",
        other: "other",
      };

      const { data: newBiz } = await supabase
        .from("businesses")
        .insert({
          roaster_id: roaster.id,
          name: bizName,
          types: ["wholesale"],
          industry: buyer.business_type ? (industryMap[buyer.business_type] || "other") : null,
          website: buyer.business_website || null,
          source: "wholesale_application",
          status: "active",
        })
        .select("id")
        .single();

      if (newBiz) {
        // Link wholesale_access
        await supabase
          .from("wholesale_access")
          .update({ business_id: newBiz.id })
          .eq("id", buyer.id);

        // Link contacts
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("roaster_id", roaster.id)
          .eq("user_id", buyer.user_id)
          .is("business_id", null);

        for (const contact of contacts || []) {
          await supabase
            .from("contacts")
            .update({ business_id: newBiz.id })
            .eq("id", contact.id);
        }

        await supabase.from("business_activity").insert({
          business_id: newBiz.id,
          activity_type: "business_created",
          description: "Business synced from wholesale application",
        });

        synced++;
      }
    }
  }

  // 2. Sync from wholesale_orders — create businesses from customer_business
  const { data: orders } = await supabase
    .from("wholesale_orders")
    .select("customer_email, customer_name, customer_business")
    .eq("roaster_id", roaster.id);

  const uniqueBusinesses = new Map<string, { email: string | null; customerName: string }>();
  for (const order of orders || []) {
    if (!order.customer_business) continue;
    const bizName = order.customer_business.trim().toLowerCase();
    if (!uniqueBusinesses.has(bizName)) {
      uniqueBusinesses.set(bizName, {
        email: order.customer_email || null,
        customerName: order.customer_name || "",
      });
    }
  }

  for (const [bizNameLower, info] of Array.from(uniqueBusinesses.entries())) {
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("roaster_id", roaster.id)
      .ilike("name", bizNameLower)
      .single();

    if (!existing) {
      const { data: newBiz } = await supabase
        .from("businesses")
        .insert({
          roaster_id: roaster.id,
          name: bizNameLower.charAt(0).toUpperCase() + bizNameLower.slice(1),
          types: ["customer"],
          email: info.email,
          source: "storefront_order",
          status: "active",
        })
        .select("id")
        .single();

      if (newBiz) {
        // Link contacts with matching email
        if (info.email) {
          const { data: contacts } = await supabase
            .from("contacts")
            .select("id")
            .eq("roaster_id", roaster.id)
            .eq("email", info.email.toLowerCase())
            .is("business_id", null);

          for (const contact of contacts || []) {
            await supabase
              .from("contacts")
              .update({ business_id: newBiz.id })
              .eq("id", contact.id);
          }
        }

        await supabase.from("business_activity").insert({
          business_id: newBiz.id,
          activity_type: "business_created",
          description: "Business synced from storefront order",
        });

        synced++;
      }
    }
  }

  // 3. Update order counts and total spend for businesses
  const { data: allBusinesses } = await supabase
    .from("businesses")
    .select("id, email")
    .eq("roaster_id", roaster.id);

  for (const biz of allBusinesses || []) {
    if (!biz.email) continue;

    const { data: bizOrders } = await supabase
      .from("wholesale_orders")
      .select("id, subtotal")
      .eq("roaster_id", roaster.id)
      .eq("customer_email", biz.email);

    if (bizOrders && bizOrders.length > 0) {
      const totalSpend = bizOrders.reduce(
        (sum, o) => sum + (parseFloat(String(o.subtotal)) || 0),
        0
      );
      await supabase
        .from("businesses")
        .update({
          order_count: bizOrders.length,
          total_spend: totalSpend,
        })
        .eq("id", biz.id);
    }
  }

  return NextResponse.json({ synced, message: `Synced ${synced} businesses` });
}
