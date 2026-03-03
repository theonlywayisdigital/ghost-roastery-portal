import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
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

  // Get recipients
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", id)
    .order("sent_at", { ascending: false });

  // Get links
  const { data: links } = await supabase
    .from("campaign_links")
    .select("*")
    .eq("campaign_id", id)
    .order("click_count", { ascending: false });

  // Calculate stats
  const allRecipients = recipients || [];
  const total = allRecipients.length;
  const sent = allRecipients.filter((r) => r.status !== "pending" && r.status !== "failed").length;
  const delivered = allRecipients.filter((r) =>
    ["delivered", "opened", "clicked"].includes(r.status)
  ).length;
  const opened = allRecipients.filter((r) => r.opened_at).length;
  const clicked = allRecipients.filter((r) => r.clicked_at).length;
  const bounced = allRecipients.filter((r) => r.status === "bounced").length;
  const complained = allRecipients.filter((r) => r.status === "complained").length;

  const stats = {
    total,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    open_rate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    click_rate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
    bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
  };

  return NextResponse.json({
    campaign,
    stats,
    recipients: allRecipients,
    links: links || [],
  });
}
