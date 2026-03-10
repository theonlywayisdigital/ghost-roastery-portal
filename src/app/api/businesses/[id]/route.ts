import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger } from "@/lib/automation-triggers";

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

  // Get business
  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Get activity
  const { data: activity } = await supabase
    .from("business_activity")
    .select("*")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get notes
  const { data: notes } = await supabase
    .from("business_notes")
    .select("*")
    .eq("business_id", id)
    .order("created_at", { ascending: false });

  // Get linked contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, role, types, status")
    .eq("business_id", id)
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: true });

  // Get contact activity for linked contacts (for unified timeline)
  const contactIds = (contacts || []).map((c) => c.id);
  let contactActivity: unknown[] = [];
  if (contactIds.length > 0) {
    const { data: cActivity } = await supabase
      .from("contact_activity")
      .select("*, contacts!contact_activity_contact_id_fkey(first_name, last_name)")
      .in("contact_id", contactIds)
      .order("created_at", { ascending: false })
      .limit(50);
    contactActivity = cActivity || [];
  }

  // Get orders (by business email match)
  let orders: unknown[] = [];
  if (business.email) {
    const { data: orderData } = await supabase
      .from("wholesale_orders")
      .select("id, customer_name, items, subtotal, total, status, created_at")
      .eq("roaster_id", roaster.id)
      .eq("customer_email", business.email)
      .order("created_at", { ascending: false })
      .limit(10);
    orders = orderData || [];
  }

  // Get invoices (through linked contacts' user_ids)
  let invoices: unknown[] = [];
  if (contacts && contacts.length > 0) {
    // Get user_ids from linked contacts
    const { data: contactsWithUsers } = await supabase
      .from("contacts")
      .select("user_id")
      .eq("business_id", id)
      .not("user_id", "is", null);

    const userIds = (contactsWithUsers || [])
      .map((c) => c.user_id)
      .filter(Boolean) as string[];

    if (userIds.length > 0) {
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, invoice_number, subtotal, total, status, payment_status, payment_due_date, created_at")
        .eq("roaster_id", roaster.id)
        .in("buyer_id", userIds)
        .order("created_at", { ascending: false })
        .limit(10);
      invoices = invoiceData || [];
    }
  }

  // Get wholesale access
  let wholesaleAccess = null;
  if ((business.types as string[])?.includes("wholesale")) {
    const { data: waData } = await supabase
      .from("wholesale_access")
      .select("status, price_tier, payment_terms, credit_limit, approved_at, created_at")
      .eq("roaster_id", roaster.id)
      .eq("business_id", id)
      .single();
    wholesaleAccess = waData;
  }

  return NextResponse.json({
    business,
    activity: activity || [],
    notes: notes || [],
    contacts: contacts || [],
    contactActivity,
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
      .from("businesses")
      .select("id, types, status, lead_status")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const allowedFields = [
      "name", "types", "industry", "status", "lead_status",
      "email", "phone", "website", "notes",
      "address_line_1", "address_line_2", "city", "county", "postcode", "country",
    ];

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    const { error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      console.error("Business update error:", error);
      return NextResponse.json(
        { error: "Failed to update business" },
        { status: 500 }
      );
    }

    // Log activity for lead_status/status/type changes
    if ("lead_status" in body && body.lead_status !== existing.lead_status) {
      // Fetch stage name for readable description
      let stageName = body.lead_status;
      const { data: stageRow } = await supabase
        .from("pipeline_stages")
        .select("name")
        .eq("roaster_id", roaster.id)
        .eq("slug", body.lead_status)
        .maybeSingle();
      if (stageRow) stageName = stageRow.name;

      await supabase.from("business_activity").insert({
        business_id: id,
        author_id: user.id,
        activity_type: "lead_status_changed",
        description: `Stage changed to ${stageName}`,
        metadata: { old_lead_status: existing.lead_status, new_lead_status: body.lead_status },
      });

      // Fire automation trigger — find primary contact for this business
      const { data: primaryContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("business_id", id)
        .eq("roaster_id", roaster.id)
        .limit(1)
        .single();

      if (primaryContact) {
        fireAutomationTrigger({
          trigger_type: "lead_status_changed",
          roaster_id: roaster.id as string,
          contact_id: primaryContact.id,
          event_data: { new_status: body.lead_status, old_status: existing.lead_status },
        }).catch(() => {});
      }
    }

    if ("status" in body && body.status !== existing.status) {
      await supabase.from("business_activity").insert({
        business_id: id,
        author_id: user.id,
        activity_type: "status_changed",
        description: `Status changed from ${existing.status} to ${body.status}`,
        metadata: { old_status: existing.status, new_status: body.status },
      });
    }

    if ("types" in body) {
      const oldTypes = (existing.types as string[]) || [];
      const newTypes = (body.types as string[]) || [];
      if (JSON.stringify(oldTypes.sort()) !== JSON.stringify(newTypes.sort())) {
        await supabase.from("business_activity").insert({
          business_id: id,
          author_id: user.id,
          activity_type: "type_changed",
          description: `Types changed from [${oldTypes.join(", ")}] to [${newTypes.join(", ")}]`,
          metadata: { old_types: oldTypes, new_types: newTypes },
        });

        // Fire trigger for business type change — find primary contact
        const { data: primaryContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("business_id", id)
          .eq("roaster_id", roaster.id)
          .limit(1)
          .single();

        if (primaryContact) {
          const addedTypes = newTypes.filter((t) => !oldTypes.includes(t));
          for (const newType of addedTypes) {
            fireAutomationTrigger({
              trigger_type: "business_type_changed",
              roaster_id: roaster.id as string,
              contact_id: primaryContact.id,
              event_data: { new_type: newType },
            }).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Business update error:", error);
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

    // Unlink contacts (don't delete them)
    await supabase
      .from("contacts")
      .update({ business_id: null, updated_at: new Date().toISOString() })
      .eq("business_id", id)
      .eq("roaster_id", roaster.id);

    // Soft delete — set status to archived
    const { error } = await supabase
      .from("businesses")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("roaster_id", roaster.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to archive business" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Business delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
