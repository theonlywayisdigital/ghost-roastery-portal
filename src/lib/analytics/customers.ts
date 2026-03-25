import { createServerClient } from "@/lib/supabase";
import type { DateRange, NamedValue } from "./types";
import { formatDateKey } from "./types";

export async function fetchCustomersData(roasterId: string, range: DateRange) {
  const supabase = createServerClient();

  const [ordersRes, contactsRes, wholesaleRes, topCustomersRes, leadPipelineRes, atRiskRes] = await Promise.all([
    // Orders in period for new vs returning
    supabase
      .from("orders")
      .select("customer_email, created_at")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .not("status", "eq", "cancelled")
      .order("created_at"),
    // Contacts created in period (acquisition)
    supabase
      .from("contacts")
      .select("source, created_at")
      .eq("roaster_id", roasterId)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    // Wholesale access breakdown
    supabase
      .from("wholesale_access")
      .select("price_tier, status")
      .eq("roaster_id", roasterId)
      .eq("status", "approved"),
    // Top 10 customers by spend
    supabase
      .from("contacts")
      .select("first_name, last_name, business_name, total_spend, order_count, last_activity_at")
      .eq("roaster_id", roasterId)
      .eq("status", "active")
      .gt("order_count", 0)
      .order("total_spend", { ascending: false })
      .limit(10),
    // Lead pipeline
    supabase
      .from("contacts")
      .select("lead_status")
      .eq("roaster_id", roasterId)
      .not("lead_status", "is", null),
    // At-risk customers (no order in 60 days)
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("roaster_id", roasterId)
      .eq("status", "active")
      .gt("order_count", 0)
      .lt("last_activity_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const orders = (ordersRes.data || []) as { customer_email: string; created_at: string }[];
  const contacts = (contactsRes.data || []) as { source: string; created_at: string }[];
  const wholesale = (wholesaleRes.data || []) as { price_tier: string; status: string }[];
  const topCustomers = (topCustomersRes.data || []) as {
    first_name: string;
    last_name: string;
    business_name: string | null;
    total_spend: number;
    order_count: number;
    last_activity_at: string;
  }[];
  const leads = (leadPipelineRes.data || []) as { lead_status: string }[];

  // New vs returning customers by day
  // Find all customer emails with orders BEFORE the period
  const firstOrderByEmail: Record<string, string> = {};
  for (const o of orders) {
    const email = o.customer_email?.toLowerCase();
    if (!email) continue;
    if (!firstOrderByEmail[email] || o.created_at < firstOrderByEmail[email]) {
      firstOrderByEmail[email] = o.created_at;
    }
  }

  // We need to know which emails had orders before the period
  // Fetch earliest order per email to determine new vs returning
  const allEmailsInPeriod = Array.from(new Set(orders.map((o) => o.customer_email?.toLowerCase()).filter(Boolean)));
  let existingEmails: Set<string> = new Set();
  if (allEmailsInPeriod.length > 0) {
    const { data: priorOrders } = await supabase
      .from("orders")
      .select("customer_email")
      .eq("roaster_id", roasterId)
      .lt("created_at", range.from)
      .not("status", "eq", "cancelled");
    existingEmails = new Set((priorOrders || []).map((o: any) => o.customer_email?.toLowerCase()).filter(Boolean));
  }

  const dailyNewReturning: Record<string, { new: number; returning: number }> = {};
  const seenInPeriod: Set<string> = new Set();
  for (const o of orders) {
    const email = o.customer_email?.toLowerCase();
    if (!email) continue;
    const key = formatDateKey(o.created_at);
    if (!dailyNewReturning[key]) dailyNewReturning[key] = { new: 0, returning: 0 };
    if (!seenInPeriod.has(email)) {
      seenInPeriod.add(email);
      if (existingEmails.has(email)) {
        dailyNewReturning[key].returning += 1;
      } else {
        dailyNewReturning[key].new += 1;
      }
    }
  }
  const newVsReturning = Object.entries(dailyNewReturning)
    .map(([date, v]) => ({ date, new: v.new, returning: v.returning }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Acquisition by source (donut)
  const sourceMap: Record<string, number> = {};
  for (const c of contacts) {
    const src = c.source || "unknown";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const acquisitionBySource: NamedValue[] = Object.entries(sourceMap)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value);

  // Wholesale tier breakdown (donut)
  const tierMap: Record<string, number> = {};
  for (const w of wholesale) {
    tierMap[w.price_tier] = (tierMap[w.price_tier] || 0) + 1;
  }
  const wholesaleTiers: NamedValue[] = Object.entries(tierMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Lead pipeline
  const pipelineMap: Record<string, number> = {};
  for (const l of leads) {
    pipelineMap[l.lead_status] = (pipelineMap[l.lead_status] || 0) + 1;
  }
  const leadPipeline = ["new", "contacted", "qualified", "won", "lost"].map((status) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: pipelineMap[status] || 0,
  }));

  // Retention KPIs
  const repeatCustomers = topCustomers.filter((c) => c.order_count > 1).length;
  const atRiskCount = atRiskRes.count || 0;

  // Wholesale buyer lookup for top customers table
  const topCustomersWithTier = topCustomers.map((c) => {
    const wa = wholesale.find((w: any) => w.business_name === c.business_name);
    return { ...c, priceTier: (wa as any)?.price_tier || null };
  });

  return {
    newVsReturning,
    acquisitionBySource,
    topCustomers: topCustomersWithTier,
    wholesaleTiers,
    repeatCustomers,
    atRiskCount,
    leadPipeline,
    totalCustomersInPeriod: seenInPeriod.size,
  };
}
