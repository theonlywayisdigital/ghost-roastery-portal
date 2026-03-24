import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, contactId } = await params;
    const supabase = createServerClient();

    // Verify business belongs to roaster
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", id)
      .eq("roaster_id", roaster.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Get contact name for activity log
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("id", contactId)
      .eq("business_id", id)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not linked to this business" }, { status: 404 });
    }

    // Unlink contact
    await supabase
      .from("contacts")
      .update({ business_id: null, role: null, updated_at: new Date().toISOString() })
      .eq("id", contactId);

    // Log activity
    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";
    await supabase.from("business_activity").insert({
      business_id: id,
      author_id: user.id,
      activity_type: "contact_removed",
      description: `${contactName} unlinked from ${business.name}`,
      metadata: { contact_id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unlink contact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
