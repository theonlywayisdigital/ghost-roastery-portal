import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "updated_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = applyOwnerFilter(
    supabase.from("campaigns").select("*", { count: "exact" }),
    owner
  );

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: campaigns, error, count } = await query;

  if (error) {
    console.error("Campaigns fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }

  // Get status counts
  const { data: allCampaigns } = await applyOwnerFilter(
    supabase.from("campaigns").select("status"),
    owner
  );

  const counts = { all: 0, draft: 0, scheduled: 0, sent: 0 };
  for (const c of allCampaigns || []) {
    counts.all++;
    if (c.status === "draft") counts.draft++;
    if (c.status === "scheduled") counts.scheduled++;
    if (c.status === "sent") counts.sent++;
  }

  return NextResponse.json({
    campaigns: campaigns || [],
    total: count || 0,
    page,
    limit,
    counts,
  });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        roaster_id: owner.owner_id,
        name: body.name || "Untitled Campaign",
        subject: body.subject || null,
        preview_text: body.preview_text || null,
        from_name: body.from_name || owner.display_name,
        reply_to: body.reply_to || owner.email,
        content: body.content || [],
        template_id: body.template_id || null,
        audience_type: body.audience_type || "all",
        audience_filter: body.audience_filter || {},
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Campaign create error:", error);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
