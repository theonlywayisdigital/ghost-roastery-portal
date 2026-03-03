import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger } from "@/lib/automation-triggers";

/**
 * POST /api/marketing/automations/webhook/:id
 * External webhook endpoint for custom_webhook triggers.
 * Accepts { email } or { contact_id } in the body.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: automationId } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Verify automation exists, is active, and uses custom_webhook trigger
    const { data: automation } = await supabase
      .from("automations")
      .select("id, roaster_id, trigger_type, status")
      .eq("id", automationId)
      .single();

    if (!automation) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    if (automation.status !== "active") {
      return NextResponse.json({ error: "Automation is not active" }, { status: 400 });
    }

    if (automation.trigger_type !== "custom_webhook") {
      return NextResponse.json({ error: "Automation does not accept webhooks" }, { status: 400 });
    }

    // Resolve contact
    let contactId = body.contact_id as string | undefined;

    if (!contactId && body.email) {
      const email = String(body.email).toLowerCase();
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", automation.roaster_id)
        .eq("email", email)
        .eq("status", "active")
        .single();

      if (!contact) {
        return NextResponse.json({ error: "Contact not found for this email" }, { status: 404 });
      }
      contactId = contact.id;
    }

    if (!contactId) {
      return NextResponse.json({ error: "contact_id or email required" }, { status: 400 });
    }

    const result = await fireAutomationTrigger({
      trigger_type: "custom_webhook",
      roaster_id: automation.roaster_id as string,
      contact_id: contactId,
      context: { webhook_data: body.data || {} },
    });

    return NextResponse.json({
      success: true,
      enrolled: result.enrolled,
    });
  } catch (error) {
    console.error("Webhook trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
