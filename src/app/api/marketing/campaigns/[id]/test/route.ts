import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { renderCampaignEmail } from "@/lib/marketing-email";
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
    const renderRoasterId = owner.owner_id || "platform";
    const html = renderCampaignEmail(
      campaign.content as unknown[],
      owner.display_name,
      renderRoasterId,
      (campaign.email_bg_color as string) || undefined
    );

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromName = (campaign.from_name as string) || owner.display_name;

    await resend.emails.send({
      from: `${fromName} <noreply@ghostroasting.co.uk>`,
      to: user.email,
      subject: `[TEST] ${campaign.subject}`,
      html,
      replyTo: (campaign.reply_to as string) || owner.email,
    });

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (error) {
    console.error("Test send error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
