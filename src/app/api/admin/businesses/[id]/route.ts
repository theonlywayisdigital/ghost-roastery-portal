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

  // Get business — admin can see all
  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Get roaster name if roaster-owned
  let roasterName: string | null = null;
  if (business.owner_type === "roaster" && business.roaster_id) {
    const { data: roaster } = await supabase
      .from("partner_roasters")
      .select("business_name")
      .eq("id", business.roaster_id)
      .single();
    roasterName = roaster?.business_name || null;
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
    .order("created_at", { ascending: true });

  // Get orders (by business email match)
  let orders: unknown[] = [];
  if (business.email) {
    const { data: orderData } = await supabase
      .from("wholesale_orders")
      .select("id, customer_name, items, subtotal, total, status, created_at")
      .eq("customer_email", business.email)
      .order("created_at", { ascending: false })
      .limit(10);
    orders = orderData || [];
  }

  return NextResponse.json({
    business: { ...business, roasterName },
    activity: activity || [],
    notes: notes || [],
    contacts: contacts || [],
    orders,
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

    // Verify ownership type
    const { data: existing } = await supabase
      .from("businesses")
      .select("id, types, status, lead_status, owner_type")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (existing.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot edit roaster-owned businesses" },
        { status: 403 }
      );
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
      .eq("id", id);

    if (error) {
      console.error("Admin business update error:", error);
      return NextResponse.json(
        { error: "Failed to update business" },
        { status: 500 }
      );
    }

    // Log activity for lead_status/status/type changes
    if ("lead_status" in body && body.lead_status !== existing.lead_status) {
      await supabase.from("business_activity").insert({
        business_id: id,
        author_id: user.id,
        activity_type: "lead_status_changed",
        description: `Lead status changed from ${existing.lead_status || "none"} to ${body.lead_status}`,
        metadata: { old_lead_status: existing.lead_status, new_lead_status: body.lead_status },
      });
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
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin business update error:", error);
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
      .from("businesses")
      .select("id, owner_type")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (existing.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot archive roaster-owned businesses" },
        { status: 403 }
      );
    }

    // Unlink contacts
    await supabase
      .from("contacts")
      .update({ business_id: null, updated_at: new Date().toISOString() })
      .eq("business_id", id);

    // Soft delete
    const { error } = await supabase
      .from("businesses")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to archive business" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin business delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
