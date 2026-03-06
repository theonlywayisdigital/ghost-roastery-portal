import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import type { CalendarItem } from "@/types/marketing";
import { checkFeature } from "@/lib/feature-gates";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check content calendar feature gate
  if (owner.owner_id) {
    const featureCheck = await checkFeature(owner.owner_id, "contentCalendar");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.message, upgrade_required: true },
        { status: 403 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();

  // Calculate date range covering full calendar grid weeks
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startPad = firstOfMonth.getDay();
  const rangeStart = new Date(year, month, 1 - startPad);
  const totalDays = startPad + lastOfMonth.getDate();
  const endPad = 7 - (totalDays % 7);
  const rangeEnd = endPad < 7
    ? new Date(year, month + 1, endPad + 1)
    : new Date(year, month + 1, 1);

  const from = rangeStart.toISOString();
  const to = rangeEnd.toISOString();

  const supabase = createServerClient();
  const items: CalendarItem[] = [];

  const [campaignsRes, postsRes, automationsRes, discountsRes] = await Promise.all([
    // Campaigns
    applyOwnerFilter(
      supabase.from("campaigns").select("id, name, subject, status, scheduled_at, sent_at"),
      owner
    )
      .or(`scheduled_at.gte.${from},sent_at.gte.${from}`)
      .or(`scheduled_at.lte.${to},sent_at.lte.${to}`),

    // Social posts
    applyOwnerFilter(
      supabase.from("social_posts").select("id, content, status, scheduled_for, published_at"),
      owner
    )
      .or(`scheduled_for.gte.${from},published_at.gte.${from}`)
      .or(`scheduled_for.lte.${to},published_at.lte.${to}`),

    // Automations (active only — show on today's date)
    applyOwnerFilter(
      supabase.from("automations").select("id, name, status"),
      owner
    ).eq("status", "active"),

    // Discount codes
    applyOwnerFilter(
      supabase.from("discount_codes").select("id, code, description, starts_at, expires_at, status"),
      owner
    )
      .or(`starts_at.gte.${from},expires_at.gte.${from}`)
      .or(`starts_at.lte.${to},expires_at.lte.${to}`),
  ]);

  // Map campaigns
  for (const c of campaignsRes.data || []) {
    const dateStr = c.sent_at || c.scheduled_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    items.push({
      id: `campaign-${c.id}`,
      channel: "campaign",
      title: c.name || "Untitled Campaign",
      subtitle: c.subject || undefined,
      date: d.toISOString().split("T")[0],
      time: d.toTimeString().slice(0, 5),
      status: c.status,
      link: c.status === "sent"
        ? `/campaigns/${c.id}/report`
        : `/campaigns/${c.id}/edit`,
    });
  }

  // Map social posts
  for (const p of postsRes.data || []) {
    const dateStr = p.published_at || p.scheduled_for;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    items.push({
      id: `social-${p.id}`,
      channel: "social",
      title: (p.content || "").slice(0, 60) || "Untitled Post",
      date: d.toISOString().split("T")[0],
      time: d.toTimeString().slice(0, 5),
      status: p.status,
      link: `/social/compose?postId=${p.id}`,
    });
  }

  // Map automations (persistent on today)
  const todayStr = new Date().toISOString().split("T")[0];
  for (const a of automationsRes.data || []) {
    items.push({
      id: `automation-${a.id}`,
      channel: "automation",
      title: a.name || "Untitled Automation",
      date: todayStr,
      status: a.status,
      link: `/automations/${a.id}/edit`,
    });
  }

  // Map discount codes (start + expiry entries)
  for (const dc of discountsRes.data || []) {
    if (dc.starts_at) {
      const d = new Date(dc.starts_at);
      items.push({
        id: `discount-start-${dc.id}`,
        channel: "discount",
        title: `${dc.code} starts`,
        subtitle: dc.description || undefined,
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().slice(0, 5),
        status: dc.status,
        link: `/discount-codes`,
      });
    }
    if (dc.expires_at) {
      const d = new Date(dc.expires_at);
      items.push({
        id: `discount-end-${dc.id}`,
        channel: "discount",
        title: `${dc.code} expires`,
        subtitle: dc.description || undefined,
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().slice(0, 5),
        status: dc.status,
        link: `/discount-codes`,
      });
    }
  }

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  return NextResponse.json({ items, month: monthStr });
}
