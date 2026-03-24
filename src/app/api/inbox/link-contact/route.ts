import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { findOrCreatePerson } from "@/lib/people";
import { checkLimit } from "@/lib/feature-gates";

/**
 * POST /api/inbox/link-contact
 *
 * Links inbox messages from a sender to a contact.
 * - If contactId is provided, links to existing contact
 * - If not, creates a new contact from the sender email/name, then links
 *
 * Body: { fromEmail: string; fromName?: string; contactId?: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fromEmail, fromName, contactId } = body as {
    fromEmail: string;
    fromName?: string;
    contactId?: string;
  };

  if (!fromEmail) {
    return NextResponse.json({ error: "fromEmail is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  let resolvedContactId = contactId;

  if (!resolvedContactId) {
    // Check if a contact with this email already exists for this roaster
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("roaster_id", roaster.id)
      .ilike("email", fromEmail)
      .limit(1)
      .maybeSingle();

    if (existing) {
      resolvedContactId = existing.id;
    } else {
      // Check CRM contact limit before creating
      const limitCheck = await checkLimit(roaster.id as string, "crmContacts", 1);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.message, upgrade_required: true },
          { status: 403 }
        );
      }

      // Parse name parts from fromName
      const nameParts = (fromName || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Find or create person record
      const peopleId = await findOrCreatePerson(
        supabase,
        fromEmail.toLowerCase(),
        firstName,
        lastName,
        null
      );

      // Create the contact
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert({
          roaster_id: roaster.id,
          first_name: firstName,
          last_name: lastName,
          email: fromEmail.toLowerCase(),
          types: ["retail"],
          source: "manual",
          people_id: peopleId,
        })
        .select("id")
        .single();

      if (createError || !newContact) {
        console.error("Failed to create contact:", createError);
        return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
      }

      resolvedContactId = newContact.id;

      // Log contact creation activity
      await supabase.from("contact_activity").insert({
        contact_id: resolvedContactId,
        activity_type: "contact_created",
        description: "Contact created from inbox email",
        metadata: { source: "inbox", from_email: fromEmail },
      });
    }
  }

  // Link all unlinked inbox messages from this email to the contact
  const { data: updated, error: linkError } = await supabase
    .from("inbox_messages")
    .update({ contact_id: resolvedContactId })
    .eq("roaster_id", roaster.id)
    .ilike("from_email", fromEmail)
    .is("contact_id", null)
    .select("id");

  if (linkError) {
    console.error("Failed to link messages:", linkError);
    return NextResponse.json({ error: "Failed to link messages" }, { status: 500 });
  }

  return NextResponse.json({
    contactId: resolvedContactId,
    linkedCount: updated?.length || 0,
  });
}
