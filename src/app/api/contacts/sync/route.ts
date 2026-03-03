import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { findOrCreatePerson } from "@/lib/people";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  let synced = 0;

  // 1. Sync from wholesale_access
  const { data: wholesaleBuyers } = await supabase
    .from("wholesale_access")
    .select("user_id, business_name, status, users!wholesale_access_user_id_fkey(full_name, email)")
    .eq("roaster_id", roaster.id);

  for (const buyer of wholesaleBuyers || []) {
    const userData = Array.isArray(buyer.users) ? buyer.users[0] : buyer.users;
    if (!userData?.email) continue;

    const email = userData.email.toLowerCase();

    // Check if contact exists
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, types")
      .eq("roaster_id", roaster.id)
      .eq("email", email)
      .single();

    if (existing) {
      // Ensure "wholesale" is in types
      const types = (existing.types as string[]) || [];
      if (!types.includes("wholesale")) {
        await supabase
          .from("contacts")
          .update({ types: [...types, "wholesale"], updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        synced++;
      }
    } else {
      // Create new contact
      const nameParts = (userData.full_name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const peopleId = await findOrCreatePerson(supabase, email, firstName, lastName);

      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          roaster_id: roaster.id,
          user_id: buyer.user_id,
          first_name: firstName,
          last_name: lastName,
          email,
          business_name: buyer.business_name || null,
          types: ["wholesale"],
          source: "wholesale_application",
          people_id: peopleId,
          owner_id: roaster.id,
          contact_type: "wholesale",
        })
        .select("id")
        .single();

      if (newContact) {
        await supabase.from("contact_activity").insert({
          contact_id: newContact.id,
          activity_type: "contact_created",
          description: "Contact synced from wholesale application",
        });
        synced++;
      }
    }
  }

  // 2. Sync from wholesale_orders (customer emails)
  const { data: orders } = await supabase
    .from("wholesale_orders")
    .select("customer_email, customer_name, customer_business")
    .eq("roaster_id", roaster.id);

  // Deduplicate by email
  const uniqueCustomers = new Map<string, { name: string; business: string | null }>();
  for (const order of orders || []) {
    if (!order.customer_email) continue;
    const email = order.customer_email.toLowerCase();
    if (!uniqueCustomers.has(email)) {
      uniqueCustomers.set(email, {
        name: order.customer_name || "",
        business: order.customer_business || null,
      });
    }
  }

  for (const [email, info] of Array.from(uniqueCustomers.entries())) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, types")
      .eq("roaster_id", roaster.id)
      .eq("email", email)
      .single();

    if (existing) {
      const types = (existing.types as string[]) || [];
      if (!types.includes("customer")) {
        await supabase
          .from("contacts")
          .update({ types: [...types, "customer"], updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        synced++;
      }
    } else {
      const nameParts = info.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const peopleId = await findOrCreatePerson(supabase, email, firstName, lastName);

      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          roaster_id: roaster.id,
          first_name: firstName,
          last_name: lastName,
          email,
          business_name: info.business,
          types: ["customer"],
          source: "storefront_order",
          people_id: peopleId,
          owner_id: roaster.id,
          contact_type: "customer",
        })
        .select("id")
        .single();

      if (newContact) {
        await supabase.from("contact_activity").insert({
          contact_id: newContact.id,
          activity_type: "contact_created",
          description: "Contact synced from storefront order",
        });
        synced++;
      }
    }
  }

  // 3. Backfill people_id for existing contacts missing it
  const { data: missingPeople } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, phone")
    .eq("roaster_id", roaster.id)
    .is("people_id", null);

  for (const c of missingPeople || []) {
    if (!c.email && !c.first_name && !c.last_name) continue;
    const pid = await findOrCreatePerson(supabase, c.email, c.first_name, c.last_name, c.phone);
    if (pid) {
      await supabase.from("contacts").update({ people_id: pid, owner_id: roaster.id }).eq("id", c.id);
    }
  }

  // 4. Update order counts and total spend for all contacts
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("roaster_id", roaster.id);

  for (const contact of allContacts || []) {
    if (!contact.email) continue;

    const { data: contactOrders } = await supabase
      .from("wholesale_orders")
      .select("id, subtotal")
      .eq("roaster_id", roaster.id)
      .eq("customer_email", contact.email);

    if (contactOrders && contactOrders.length > 0) {
      const totalSpend = contactOrders.reduce(
        (sum, o) => sum + (parseFloat(String(o.subtotal)) || 0),
        0
      );
      await supabase
        .from("contacts")
        .update({
          order_count: contactOrders.length,
          total_spend: totalSpend,
        })
        .eq("id", contact.id);
    }
  }

  return NextResponse.json({ synced, message: `Synced ${synced} contacts` });
}
