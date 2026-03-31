import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { renderCampaignEmail } from "@/lib/marketing-email";
import type { MarketingEmailBranding } from "@/lib/render-email-html";
import { getVerifiedDomain } from "@/lib/email";
import { Resend } from "resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const owner = await getMarketingOwner(request);
  if (!user || !owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: campaign } = await applyOwnerFilter(
    supabase.from("campaigns").select("*").eq("id", id),
    owner
  ).single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.subject) {
    return NextResponse.json({ error: "Campaign must have a subject line" }, { status: 400 });
  }

  try {
    // Fetch roaster's branding for email header
    let emailBranding: MarketingEmailBranding | null = null;
    if (owner.owner_id) {
      const { data: roaster } = await supabase
        .from("roasters")
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

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = (campaign.from_name as string) || owner.display_name;

    // Look up custom domain if this is a roaster campaign
    const customDomain = owner.owner_id ? await getVerifiedDomain(owner.owner_id) : null;
    const emailDomain = customDomain?.domain || "roasteryplatform.com";
    const emailPrefix = customDomain?.senderPrefix || "noreply";

    await resend.emails.send({
      from: `${fromName} <${emailPrefix}@${emailDomain}>`,
      to: user.email,
      subject: `[TEST] ${campaign.subject}`,
      html,
      replyTo: (campaign.reply_to as string)
        || (customDomain ? `noreply@${customDomain.domain}` : "noreply@roasteryplatform.com"),
    });

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (error) {
    console.error("Test send error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
