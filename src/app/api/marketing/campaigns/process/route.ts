import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendCampaignBatch, renderCampaignEmail, checkEmailLimits } from "@/lib/marketing-email";
import type { MarketingEmailBranding } from "@/lib/render-email-html";
import { getVerifiedDomain } from "@/lib/email";
import { splitName } from "@/lib/people";

/**
 * CRON endpoint: send scheduled campaigns that are due.
 * Called every minute via Vercel Cron (GET with Bearer CRON_SECRET).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find scheduled campaigns that are due
  const { data: dueCampaigns, error } = await supabase
    .from("campaigns")
    .select("*, roasters(id, business_name, email, brand_logo_url, brand_primary_colour, brand_accent_colour, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style)")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Campaign process cron error:", error);
    return NextResponse.json({ error: "Failed to fetch due campaigns" }, { status: 500 });
  }

  if (!dueCampaigns || dueCampaigns.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const campaign of dueCampaigns) {
    const roaster = campaign.roasters as {
      id: string;
      business_name: string;
      email: string;
      brand_logo_url: string | null;
      brand_primary_colour: string | null;
      brand_accent_colour: string | null;
      storefront_logo_size: string | null;
      storefront_button_colour: string | null;
      storefront_button_text_colour: string | null;
      storefront_button_style: string | null;
    } | null;

    try {
      if (!campaign.subject) {
        errors.push(`Campaign ${campaign.id}: missing subject`);
        continue;
      }

      // Build recipient list
      const audienceType = campaign.audience_type as string;
      let recipients: { id: string | null; email: string; first_name: string | null; last_name: string | null }[];

      if (audienceType === "custom") {
        // Use recipients from audience_filter
        const filter = campaign.audience_filter as { emails?: { email: string; name?: string; contactId?: string }[] } | null;
        const customEmails = filter?.emails || [];
        if (customEmails.length === 0) {
          await supabase
            .from("campaigns")
            .update({ status: "failed" })
            .eq("id", campaign.id);
          errors.push(`Campaign ${campaign.id}: no recipients specified`);
          continue;
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
        let contactQuery = supabase
          .from("contacts")
          .select("id, email, first_name, last_name")
          .eq("status", "active")
          .not("email", "is", null)
          .eq("unsubscribed", false)
          .eq("marketing_consent", true);

        // Scope to roaster or ghost_roastery
        if (campaign.roaster_id) {
          contactQuery = contactQuery.eq("roaster_id", campaign.roaster_id);
        } else {
          contactQuery = contactQuery.is("roaster_id", null);
        }

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
        await supabase
          .from("campaigns")
          .update({ status: "failed" })
          .eq("id", campaign.id);
        errors.push(`Campaign ${campaign.id}: no eligible recipients`);
        continue;
      }

      // Check email limits (only for roaster campaigns)
      if (campaign.roaster_id) {
        const limitCheck = await checkEmailLimits(campaign.roaster_id, recipients.length, supabase);
        if (!limitCheck.allowed) {
          errors.push(`Campaign ${campaign.id}: ${limitCheck.message}`);
          continue;
        }
      }

      // Mark as sending
      await supabase
        .from("campaigns")
        .update({ status: "sending", recipient_count: recipients.length })
        .eq("id", campaign.id);

      // Insert recipient records
      const recipientRecords = recipients.map((c) => ({
        campaign_id: campaign.id,
        contact_id: c.id || undefined,
        email: c.email,
        status: "pending" as const,
      }));
      await supabase.from("campaign_recipients").insert(recipientRecords);

      // Render email
      const displayName = roaster?.business_name || "Roastery Platform";
      const renderRoasterId = campaign.roaster_id || "platform";
      const mBranding: MarketingEmailBranding | null = roaster ? {
        primaryColour: roaster.brand_primary_colour,
        accentColour: roaster.brand_accent_colour,
        buttonColour: roaster.storefront_button_colour,
        buttonTextColour: roaster.storefront_button_text_colour,
        buttonStyle: roaster.storefront_button_style as "sharp" | "rounded" | "pill" | null,
        logoUrl: roaster.brand_logo_url,
        logoSize: roaster.storefront_logo_size as "small" | "medium" | "large" | null,
      } : null;
      const html = renderCampaignEmail(
        campaign.content as unknown[],
        displayName,
        renderRoasterId,
        (campaign.email_bg_color as string) || undefined,
        mBranding?.logoUrl,
        mBranding?.accentColour,
        mBranding?.logoSize,
        mBranding
      );

      // Send
      const fromName = (campaign.from_name as string) || displayName;
      const customDomain = campaign.roaster_id
        ? await getVerifiedDomain(campaign.roaster_id)
        : null;

      // Reply-To: explicit campaign setting > noreply@custom-domain > noreply@roasteryplatform.com
      const replyTo = (campaign.reply_to as string)
        || (customDomain ? `noreply@${customDomain.domain}` : "noreply@roasteryplatform.com");

      await sendCampaignBatch({
        campaignId: campaign.id,
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

      // Mark as sent
      await supabase
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);

      // Increment monthly email count
      if (campaign.roaster_id) {
        const { error: rpcError } = await supabase.rpc("increment_monthly_emails", {
          p_roaster_id: campaign.roaster_id,
          p_count: recipients.length,
        });

        if (rpcError) {
          await supabase
            .from("roasters")
            .update({ monthly_emails_sent: recipients.length })
            .eq("id", campaign.roaster_id);
        }
      }

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Campaign ${campaign.id}: ${msg}`);
      console.error(`Failed to process campaign ${campaign.id}:`, err);

      // Mark as failed
      await supabase
        .from("campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);
    }
  }

  return NextResponse.json({ processed, total: dueCampaigns.length, errors });
}
