import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabase = createServerClient();
    const emailId = data.email_id;

    if (!emailId) {
      return NextResponse.json({ received: true });
    }

    // Find the recipient by resend_id
    const { data: recipient } = await supabase
      .from("campaign_recipients")
      .select("id, campaign_id, contact_id, email")
      .eq("resend_id", emailId)
      .single();

    const now = new Date().toISOString();

    if (recipient) {
      // ── Campaign email events ──
      switch (type) {
        case "email.delivered":
          await supabase
            .from("campaign_recipients")
            .update({ status: "delivered" })
            .eq("id", recipient.id)
            .in("status", ["pending", "sent"]);
          break;

        case "email.opened":
          await supabase
            .from("campaign_recipients")
            .update({ status: "opened", opened_at: now })
            .eq("id", recipient.id)
            .is("opened_at", null);

          // Fire email engagement trigger
          if (recipient.contact_id) {
            fireEmailEngagementTrigger(supabase, recipient, "opened");
          }
          break;

        case "email.clicked": {
          await supabase
            .from("campaign_recipients")
            .update({ status: "clicked", clicked_at: now })
            .eq("id", recipient.id)
            .is("clicked_at", null);

          // Fire email engagement trigger
          if (recipient.contact_id) {
            fireEmailEngagementTrigger(supabase, recipient, "clicked");
          }

          // Track link clicks
          const clickedUrl = data.click?.link;
          if (clickedUrl) {
            const { data: existingLink } = await supabase
              .from("campaign_links")
              .select("id, click_count")
              .eq("campaign_id", recipient.campaign_id)
              .eq("url", clickedUrl)
              .single();

            if (existingLink) {
              await supabase
                .from("campaign_links")
                .update({ click_count: existingLink.click_count + 1 })
                .eq("id", existingLink.id);
            } else {
              await supabase
                .from("campaign_links")
                .insert({
                  campaign_id: recipient.campaign_id,
                  url: clickedUrl,
                  click_count: 1,
                });
            }
          }
          break;
        }

        case "email.bounced":
          await supabase
            .from("campaign_recipients")
            .update({ status: "bounced", bounced_at: now })
            .eq("id", recipient.id);
          break;

        case "email.complained":
          await supabase
            .from("campaign_recipients")
            .update({ status: "complained", unsubscribed_at: now })
            .eq("id", recipient.id);

          // Auto-unsubscribe on complaint
          await supabase
            .from("contacts")
            .update({ unsubscribed: true, unsubscribed_at: now })
            .eq("email", recipient.email);
          break;
      }
    }

    // ── Automation email events (check automation_step_logs by resend_id) ──
    if (type === "email.opened" || type === "email.clicked" || type === "email.bounced") {
      const { data: stepLog } = await supabase
        .from("automation_step_logs")
        .select("id, status")
        .eq("resend_id", emailId)
        .single();

      if (stepLog) {
        if (type === "email.opened" && stepLog.status === "sent") {
          await supabase
            .from("automation_step_logs")
            .update({ status: "opened", opened_at: now })
            .eq("id", stepLog.id);
        } else if (type === "email.clicked") {
          await supabase
            .from("automation_step_logs")
            .update({ status: "clicked", clicked_at: now })
            .eq("id", stepLog.id);
        } else if (type === "email.bounced") {
          await supabase
            .from("automation_step_logs")
            .update({ status: "bounced" })
            .eq("id", stepLog.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fireEmailEngagementTrigger(
  supabase: ReturnType<typeof createServerClient>,
  recipient: { contact_id: string | null; campaign_id: string },
  engagementType: "opened" | "clicked"
) {
  if (!recipient.contact_id) return;

  // Get campaign to find roaster_id
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("roaster_id")
    .eq("id", recipient.campaign_id)
    .single();

  if (!campaign?.roaster_id) return;

  fireAutomationTrigger({
    trigger_type: "email_engagement",
    roaster_id: campaign.roaster_id,
    contact_id: recipient.contact_id,
    event_data: { engagement_type: engagementType, campaign_id: recipient.campaign_id },
  }).catch(() => {});

  updateContactActivity(recipient.contact_id).catch(() => {});
}
