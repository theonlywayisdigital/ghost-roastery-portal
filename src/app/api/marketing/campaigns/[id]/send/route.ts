import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { sendCampaignBatch, checkEmailLimits, renderCampaignEmail } from "@/lib/marketing-email";
import type { MarketingEmailBranding } from "@/lib/render-email-html";
import { getVerifiedDomain } from "@/lib/email";
import { splitName } from "@/lib/people";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Get campaign
  const { data: campaign } = await applyOwnerFilter(
    supabase.from("campaigns").select("*").eq("id", id),
    owner
  ).single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Campaign has already been sent" }, { status: 400 });
  }

  if (!campaign.subject) {
    return NextResponse.json({ error: "Campaign must have a subject line" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Check if scheduling
    if (body.scheduled_at) {
      await supabase
        .from("campaigns")
        .update({ status: "scheduled", scheduled_at: body.scheduled_at })
        .eq("id", id);

      return NextResponse.json({ success: true, scheduled: true });
    }

    // Build recipient list
    const audienceType = campaign.audience_type as string;
    let recipients: { id: string | null; email: string; first_name: string | null; last_name: string | null }[];

    if (audienceType === "custom") {
      // Use recipients from audience_filter
      const filter = campaign.audience_filter as { emails?: { email: string; name?: string; contactId?: string }[] } | null;
      const customEmails = filter?.emails || [];
      if (customEmails.length === 0) {
        return NextResponse.json({ error: "No recipients specified" }, { status: 400 });
      }
      recipients = customEmails.map((r) => {
        const { firstName, lastName } = splitName(r.name);
        return {
          id: r.contactId || null,
          email: r.email,
          first_name: firstName || null,
          last_name: lastName || null,
        };
      });
    } else {
      // Build recipient list from contacts
      let contactQuery = applyOwnerFilter(
        supabase
          .from("contacts")
          .select("id, email, first_name, last_name")
          .eq("status", "active")
          .not("email", "is", null)
          .eq("unsubscribed", false),
        owner
      );

      if (audienceType !== "all") {
        const typeMap: Record<string, string> = {
          customers: "retail",
          wholesale: "wholesale",
          suppliers: "supplier",
          leads: "lead",
        };
        const contactType = typeMap[audienceType];
        if (contactType) {
          contactQuery = contactQuery.contains("types", [contactType]);
        }
      }

      const { data: contacts } = await contactQuery;
      recipients = (contacts || []).filter((c) => c.email).map((c) => ({
        id: c.id,
        email: c.email!,
        first_name: c.first_name,
        last_name: c.last_name,
      }));
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No eligible recipients found" }, { status: 400 });
    }

    // Check email limits (skip for admin/platform sends)
    if (owner.owner_type === "roaster" && owner.owner_id) {
      const limitCheck = await checkEmailLimits(owner.owner_id, recipients.length, supabase);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.message }, { status: 429 });
      }
    }

    // Mark campaign as sending
    await supabase
      .from("campaigns")
      .update({ status: "sending", recipient_count: recipients.length })
      .eq("id", id);

    // Insert recipient records
    const recipientRecords = recipients.map((c) => ({
      campaign_id: id,
      contact_id: c.id || undefined,
      email: c.email,
      status: "pending" as const,
    }));

    await supabase.from("campaign_recipients").insert(recipientRecords);

    // Fetch roaster's branding for email header
    let emailBranding: MarketingEmailBranding | null = null;
    if (owner.owner_id) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style")
        .eq("id", owner.owner_id)
        .single();
      if (roaster) {
        emailBranding = {
          primaryColour: (roaster.brand_primary_colour as string) || null,
          accentColour: (roaster.brand_accent_colour as string) || null,
          buttonColour: (roaster.storefront_button_colour as string) || null,
          buttonTextColour: (roaster.storefront_button_text_colour as string) || null,
          buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || null,
          logoUrl: (roaster.brand_logo_url as string) || null,
          logoSize: (roaster.storefront_logo_size as "small" | "medium" | "large") || null,
        };
      }
    }

    // Render email HTML — use a placeholder roaster_id for admin unsubscribe links
    const renderRoasterId = owner.owner_id || "platform";
    const html = renderCampaignEmail(
      campaign.content as unknown[],
      owner.display_name,
      renderRoasterId,
      (campaign.email_bg_color as string) || undefined,
      emailBranding?.logoUrl,
      emailBranding?.accentColour,
      emailBranding?.logoSize,
      emailBranding
    );

    // Send in batches
    const fromName = (campaign.from_name as string) || owner.display_name;

    // Look up custom domain if this is a roaster campaign
    const customDomain = owner.owner_id ? await getVerifiedDomain(owner.owner_id) : null;

    // Reply-To: explicit campaign setting > noreply@custom-domain > noreply@roasteryplatform.com
    const replyTo = (campaign.reply_to as string)
      || (customDomain ? `noreply@${customDomain.domain}` : "noreply@roasteryplatform.com");

    await sendCampaignBatch({
      campaignId: id,
      roasterId: renderRoasterId,
      recipients: recipients.map((c) => ({
        contactId: c.id || "",
        email: c.email,
        name: [c.first_name, c.last_name].filter(Boolean).join(" ") || undefined,
      })),
      subject: campaign.subject as string,
      previewText: (campaign.preview_text as string) || undefined,
      html,
      fromName,
      replyTo,
      supabase,
      customDomain,
    });

    // Update sent count
    await supabase
      .from("campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    // Increment monthly email count (only for roasters)
    if (owner.owner_type === "roaster" && owner.owner_id) {
      const { error: rpcError } = await supabase.rpc("increment_monthly_emails", {
        p_roaster_id: owner.owner_id,
        p_count: recipients.length,
      });

      if (rpcError) {
        await supabase
          .from("partner_roasters")
          .update({
            monthly_emails_sent: recipients.length,
          })
          .eq("id", owner.owner_id);
      }
    }

    return NextResponse.json({
      success: true,
      recipient_count: recipients.length,
    });
  } catch (error) {
    console.error("Campaign send error:", error);

    // Mark as failed
    await supabase
      .from("campaigns")
      .update({ status: "failed" })
      .eq("id", id);

    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
