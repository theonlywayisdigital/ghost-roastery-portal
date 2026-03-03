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
  const [teamResult, productResult, orderResult] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("wholesale_products")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", id),
    supabase
      .from("wholesale_orders")
      .select("subtotal")
      .eq("roaster_id", id),
  ]);

  const teamCount = teamResult.count || 0;
  const productCount = productResult.count || 0;

  const orders = orderResult.data || [];
  const orderCount = orders.length;
  const revenue = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

  return NextResponse.json({
    roaster,
    stats: {
      teamCount,
      productCount,
      orderCount,
      revenue,
    },
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
      .select("id, is_active")
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
