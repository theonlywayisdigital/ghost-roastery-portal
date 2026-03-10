import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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

  // Get contact (with business join) — no roaster_id filter, admin can see all
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*, businesses(id, name, types, total_spend, industry)")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Get roaster name if roaster-owned
  let roasterName: string | null = null;
  if (contact.owner_type === "roaster" && contact.roaster_id) {
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("business_name")
      .eq("id", contact.roaster_id)
      .single();
    roasterName = roaster?.business_name || null;
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

  // Get orders (by email match — for ghost_roastery contacts, check across all roasters)
  let orders: unknown[] = [];
  if (contact.email) {
    const { data: orderData } = await supabase
      .from("wholesale_orders")
      .select("id, customer_name, items, subtotal, total, status, created_at")
      .eq("customer_email", contact.email)
      .order("created_at", { ascending: false })
      .limit(10);
    orders = orderData || [];
  }

  // Check for cross-reference (same email in other owner_type)
  let crossReference: { id: string; owner_type: string; roasterName?: string } | null = null;
  if (contact.email) {
    const otherOwnerType = contact.owner_type === "ghost_roastery" ? "roaster" : "ghost_roastery";
    const { data: crossContact } = await supabase
      .from("contacts")
      .select("id, owner_type, roaster_id")
      .eq("email", contact.email)
      .eq("owner_type", otherOwnerType)
      .limit(1)
      .single();

    if (crossContact) {
      crossReference = { id: crossContact.id, owner_type: crossContact.owner_type };
      if (crossContact.roaster_id) {
        const { data: crossRoaster } = await supabase
          .from("partner_roasters")
          .select("business_name")
          .eq("id", crossContact.roaster_id)
          .single();
        crossReference.roasterName = crossRoaster?.business_name || undefined;
      }
    }
  }

  return NextResponse.json({
    contact: { ...contact, roasterName },
    activity: activity || [],
    notes: notes || [],
    orders,
    crossReference,
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

    // Get existing contact
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, types, status, lead_status, owner_type")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Only allow editing ghost_roastery contacts
    if (existing.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot edit roaster-owned contacts" },
        { status: 403 }
      );
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
      .eq("id", id);

    if (error) {
      console.error("Admin contact update error:", error);
      return NextResponse.json(
        { error: "Failed to update contact" },
        { status: 500 }
      );
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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin contact update error:", error);
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

    // Check owner_type
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, owner_type")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (existing.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot archive roaster-owned contacts" },
        { status: 403 }
      );
    }

    // Soft delete — set status to archived
    const { error } = await supabase
      .from("contacts")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to archive contact" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin contact delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
