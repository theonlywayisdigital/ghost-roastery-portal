import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
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
    const { contact_id, role } = body;

    if (!contact_id) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify business belongs to roaster
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, types")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Verify contact belongs to roaster
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, types")
      .eq("id", contact_id)
      .eq("roaster_id", roaster.id)
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

    // Sync types: if business is wholesale, ensure contact has wholesale type
    const bizTypes = (business.types as string[]) || [];
    const contactTypes = (contact.types as string[]) || [];
    const typesToAdd = bizTypes.filter((t) => !contactTypes.includes(t));
    if (typesToAdd.length > 0) {
      await supabase
        .from("contacts")
        .update({ types: [...contactTypes, ...typesToAdd] })
        .eq("id", contact_id);
    }

    // Log activity on business
    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";
    await supabase.from("business_activity").insert({
      business_id: id,
      author_id: user.id,
      activity_type: "contact_added",
      description: `${contactName} linked to ${business.name}`,
      metadata: { contact_id },
    });

    // Update last_activity_at
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
