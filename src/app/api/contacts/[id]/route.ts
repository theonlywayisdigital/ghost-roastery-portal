import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { findOrCreatePerson, resolvePrimaryContactType, updatePersonIfNeeded } from "@/lib/people";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Get contact (with business join)
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*, businesses(id, name, types, total_spend, industry)")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Get activity
  const { data: activity } = await supabase
    .from("contact_activity")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get notes
  const { data: notes } = await supabase
    .from("contact_notes")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  // Get orders (by email match)
  let orders: unknown[] = [];
  if (contact.email) {
    const { data: orderData } = await supabase
      .from("wholesale_orders")
      .select("id, customer_name, items, subtotal, total, status, created_at")
      .eq("roaster_id", roaster.id)
      .eq("customer_email", contact.email)
      .order("created_at", { ascending: false })
      .limit(10);
    orders = orderData || [];
  }

  // Get invoices (by email match through buyer)
  let invoices: unknown[] = [];
  // Try to find buyer_id via wholesale_access user_id
  if (contact.user_id) {
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("id, invoice_number, subtotal, total, status, payment_status, payment_due_date, created_at")
      .eq("roaster_id", roaster.id)
      .eq("buyer_id", contact.user_id)
      .order("created_at", { ascending: false })
      .limit(10);
    invoices = invoiceData || [];
  }

  // Get wholesale access details
  let wholesaleAccess = null;
  if ((contact.types as string[])?.includes("wholesale") && contact.user_id) {
    const { data: waData } = await supabase
      .from("wholesale_access")
      .select("status, price_tier, payment_terms, credit_limit, approved_at, created_at")
      .eq("roaster_id", roaster.id)
      .eq("user_id", contact.user_id)
      .single();
    wholesaleAccess = waData;
  } else if ((contact.types as string[])?.includes("wholesale") && contact.email) {
    // Try email match via users table
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const matchedUser = authUser?.users?.find(
      (u) => u.email?.toLowerCase() === contact.email?.toLowerCase()
    );
    if (matchedUser) {
      const { data: waData } = await supabase
        .from("wholesale_access")
        .select("status, price_tier, payment_terms, credit_limit, approved_at, created_at")
        .eq("roaster_id", roaster.id)
        .eq("user_id", matchedUser.id)
        .single();
      wholesaleAccess = waData;
    }
  }

  return NextResponse.json({
    contact,
    activity: activity || [],
    notes: notes || [],
    orders,
    invoices,
    wholesaleAccess,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, types, status, lead_status, email, first_name, last_name, phone, people_id")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const allowedFields = [
      "first_name", "last_name", "email", "phone", "business_name",
      "types", "status", "lead_status", "business_id", "role",
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      console.error("Contact update error:", error);
      return NextResponse.json(
        { error: "Failed to update contact" },
        { status: 500 }
      );
    }

    // Handle people record updates
    if (existing.people_id) {
      // If email changed, re-resolve person
      if ("email" in body && body.email?.toLowerCase() !== existing.email?.toLowerCase()) {
        const newPeopleId = await findOrCreatePerson(
          supabase,
          body.email?.toLowerCase(),
          body.first_name || existing.first_name,
          body.last_name || existing.last_name,
          body.phone || existing.phone
        );
        if (newPeopleId) {
          await supabase.from("contacts").update({ people_id: newPeopleId }).eq("id", id);
        }
      } else {
        // Update person record if name/phone changed
        await updatePersonIfNeeded(supabase, existing.people_id, {
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone,
        }, {
          first_name: existing.first_name,
          last_name: existing.last_name,
          phone: existing.phone,
        });
      }
    } else if (!existing.people_id) {
      // Backfill: create people record for this contact
      const email = body.email?.toLowerCase() || existing.email?.toLowerCase();
      const peopleId = await findOrCreatePerson(
        supabase,
        email,
        body.first_name || existing.first_name,
        body.last_name || existing.last_name,
        body.phone || existing.phone
      );
      if (peopleId) {
        await supabase.from("contacts").update({ people_id: peopleId }).eq("id", id);
      }
    }

    // Update contact_type if types changed
    if ("types" in body) {
      const newTypes = (body.types as string[]) || [];
      updates.contact_type = resolvePrimaryContactType(newTypes);
    }

    // Log activity for status/type changes
    if ("status" in body && body.status !== existing.status) {
      await supabase.from("contact_activity").insert({
        contact_id: id,
        activity_type: "status_changed",
        description: `Status changed from ${existing.status} to ${body.status}`,
        metadata: { old_status: existing.status, new_status: body.status },
      });
    }

    if ("lead_status" in body && body.lead_status !== existing.lead_status) {
      await supabase.from("contact_activity").insert({
        contact_id: id,
        activity_type: "lead_status_changed",
        description: `Lead status changed from ${existing.lead_status || "none"} to ${body.lead_status}`,
        metadata: { old_lead_status: existing.lead_status, new_lead_status: body.lead_status },
      });

      fireAutomationTrigger({
        trigger_type: "lead_status_changed",
        roaster_id: roaster.id as string,
        contact_id: id,
        event_data: { new_status: body.lead_status, old_status: existing.lead_status },
      }).catch(() => {});
    }

    if ("types" in body) {
      const oldTypes = (existing.types as string[]) || [];
      const newTypes = (body.types as string[]) || [];
      if (JSON.stringify(oldTypes.sort()) !== JSON.stringify(newTypes.sort())) {
        await supabase.from("contact_activity").insert({
          contact_id: id,
          activity_type: "type_changed",
          description: `Types changed from [${oldTypes.join(", ")}] to [${newTypes.join(", ")}]`,
          metadata: { old_types: oldTypes, new_types: newTypes },
        });

        // Fire trigger for each new type that was added
        const addedTypes = newTypes.filter((t) => !oldTypes.includes(t));
        for (const newType of addedTypes) {
          fireAutomationTrigger({
            trigger_type: "contact_type_changed",
            roaster_id: roaster.id as string,
            contact_id: id,
            event_data: { new_type: newType },
          }).catch(() => {});
        }
      }
    }

    // Update last activity
    updateContactActivity(id).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact update error:", error);
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
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Soft delete — set status to archived
    const { error } = await supabase
      .from("contacts")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to archive contact" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
