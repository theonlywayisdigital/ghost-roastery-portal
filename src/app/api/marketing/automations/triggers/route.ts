import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";
import { getPrimaryTriggers } from "@/lib/trigger-definitions";

/**
 * GET /api/marketing/automations/triggers
 * Returns trigger definitions + dynamic option values for the trigger editor UI.
 */
export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch dynamic options in parallel
  const [
    formsResult,
    contactTypesResult,
    contactSourcesResult,
    businessTypesResult,
    discountCodesResult,
    campaignsResult,
  ] = await Promise.all([
    applyOwnerFilter(
      supabase.from("forms").select("id, name"),
      owner
    )
      .eq("status", "active")
      .order("name"),
    applyOwnerFilter(
      supabase.from("contacts").select("types"),
      owner
    ).neq("status", "archived"),
    applyOwnerFilter(
      supabase.from("contacts").select("source"),
      owner
    ).neq("status", "archived"),
    applyOwnerFilter(
      supabase.from("businesses").select("types"),
      owner
    ).neq("status", "archived"),
    applyOwnerFilter(
      supabase.from("discount_codes").select("id, code"),
      owner
    )
      .in("status", ["active", "paused"])
      .order("code"),
    applyOwnerFilter(
      supabase.from("campaigns").select("id, name"),
      owner
    )
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(50),
  ]);

  // Extract unique contact types
  const contactTypes = new Set<string>();
  for (const c of contactTypesResult.data || []) {
    const types = (c.types as string[]) || [];
    types.forEach((t) => contactTypes.add(t));
  }

  // Extract unique contact sources
  const contactSources = new Set<string>();
  for (const c of contactSourcesResult.data || []) {
    if (c.source) contactSources.add(c.source as string);
  }

  // Extract unique business types
  const businessTypes = new Set<string>();
  for (const b of businessTypesResult.data || []) {
    const types = (b.types as string[]) || [];
    types.forEach((t) => businessTypes.add(t));
  }

  const dynamicOptions: Record<string, { value: string; label: string }[]> = {
    forms: (formsResult.data || []).map((f) => ({ value: f.id, label: f.name })),
    contact_types: Array.from(contactTypes)
      .sort()
      .map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    contact_sources: Array.from(contactSources)
      .sort()
      .map((s) => ({ value: s, label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })),
    business_types: Array.from(businessTypes)
      .sort()
      .map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
    discount_codes: (discountCodesResult.data || []).map((d) => ({ value: d.id, label: d.code })),
    campaigns: (campaignsResult.data || []).map((c) => ({ value: c.id, label: c.name })),
  };

  return NextResponse.json({
    definitions: getPrimaryTriggers(),
    dynamicOptions,
  });
}
