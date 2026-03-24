import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
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
    const { contact_id, role } = body;

    if (!contact_id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify business is ghost_roastery
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, types, owner_type")
      .eq("id", id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.owner_type !== "ghost_roastery") {
      return NextResponse.json(
        { error: "Cannot link contacts to roaster-owned businesses" },
        { status: 403 }
      );
    }

    // Verify contact exists and is ghost_roastery
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, types, owner_type")
      .eq("id", contact_id)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Link contact to business
    const updateData: Record<string, unknown> = {
      business_id: id,
      updated_at: new Date().toISOString(),
    };
    if (role) {
      updateData.role = role;
    }

    await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", contact_id);

    // Log activity on business
    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";
    await supabase.from("business_activity").insert({
      business_id: id,
      author_id: user.id,
      activity_type: "contact_added",
      description: `${contactName} linked to ${business.name}`,
      metadata: { contact_id },
    });

    await supabase
      .from("businesses")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link contact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
