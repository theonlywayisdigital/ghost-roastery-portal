import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch ghost_roastery contacts with lead/wholesale/prospect types
  const { data: contacts, error: contactsErr } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, business_name, source, lead_status, total_spend, types, created_at")
    .eq("owner_type", "ghost_roastery")
    .neq("status", "archived")
    .or("types.cs.{lead},types.cs.{wholesale},types.cs.{prospect}");

  if (contactsErr) {
    console.error("Admin pipeline contacts fetch error:", contactsErr);
    return NextResponse.json({ error: "Failed to fetch pipeline data" }, { status: 500 });
  }

  // Fetch ghost_roastery businesses with lead/wholesale/prospect types
  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name, email, source, lead_status, total_spend, types, created_at")
    .eq("owner_type", "ghost_roastery")
    .neq("status", "archived")
    .or("types.cs.{lead},types.cs.{wholesale},types.cs.{prospect}");

  if (bizErr) {
    console.error("Admin pipeline businesses fetch error:", bizErr);
    return NextResponse.json({ error: "Failed to fetch pipeline data" }, { status: 500 });
  }

  // Map contacts to pipeline items
  const contactItems = (contacts || []).map((c) => ({
    id: c.id,
    itemType: "contact" as const,
    name: `${c.first_name} ${c.last_name}`.trim(),
    email: c.email,
    businessName: c.business_name,
    source: c.source || "manual",
    leadStatus: c.lead_status || "new",
    totalSpend: c.total_spend || 0,
    types: (c.types as string[]) || [],
    createdAt: c.created_at,
  }));

  // Map businesses to pipeline items
  const businessItems = (businesses || []).map((b) => ({
    id: b.id,
    itemType: "business" as const,
    name: b.name,
    email: b.email,
    businessName: null,
    source: b.source || "manual",
    leadStatus: b.lead_status || "new",
    totalSpend: b.total_spend || 0,
    types: (b.types as string[]) || [],
    createdAt: b.created_at,
  }));

  const items = [...contactItems, ...businessItems];

  // Count by stage — admin pipeline uses a static set since it spans all roasters
  const stageSlugs = ["lead", "contacted", "access_granted", "won", "lost"];
  const counts: Record<string, number> = {};
  for (const slug of stageSlugs) {
    counts[slug] = 0;
  }
  for (const item of items) {
    if (item.leadStatus in counts) {
      counts[item.leadStatus]++;
    } else {
      counts[stageSlugs[0]]++;
    }
  }

  return NextResponse.json({ items, counts });
}
