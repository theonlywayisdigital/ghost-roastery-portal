import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { findOrCreatePerson, resolvePrimaryContactType } from "@/lib/people";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ownerType = searchParams.get("ownerType") || "ghost_roastery";
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "active";
  const leadStatus = searchParams.get("lead_status") || "";
  const roasterId = searchParams.get("roasterId") || "";
  const sort = searchParams.get("sort") || "last_activity_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("contacts")
    .select("*, businesses(id, name)", { count: "exact" })
    .eq("owner_type", ownerType);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (type) {
    query = query.contains("types", [type]);
  }

  if (leadStatus) {
    query = query.eq("lead_status", leadStatus);
  }

  if (roasterId && ownerType === "roaster") {
    query = query.eq("roaster_id", roasterId);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%`
    );
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: contacts, error, count } = await query;

  if (error) {
    console.error("Admin contacts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }

  // For roaster tab, fetch roaster names
  let contactsWithRoaster = contacts || [];
  if (ownerType === "roaster") {
    const roasterIds = Array.from(new Set((contacts || []).map((c) => c.roaster_id).filter(Boolean)));
    if (roasterIds.length > 0) {
      const { data: roasters } = await supabase
        .from("partner_roasters")
        .select("id, business_name")
        .in("id", roasterIds as string[]);

      const roasterMap = new Map((roasters || []).map((r) => [r.id, r.business_name]));
      contactsWithRoaster = (contacts || []).map((c) => ({
        ...c,
        roasterName: c.roaster_id ? roasterMap.get(c.roaster_id) || null : null,
      }));
    }
  }

  // Get tab counts
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("types, status")
    .eq("owner_type", ownerType)
    .neq("status", "archived");

  const counts = {
    all: 0,
    retail: 0,
    lead: 0,
    supplier: 0,
    roaster: 0,
    partner: 0,
    wholesale: 0,
  };

  for (const c of allContacts || []) {
    counts.all++;
    const types = (c.types as string[]) || [];
    if (types.includes("retail")) counts.retail++;
    if (types.includes("lead")) counts.lead++;
    if (types.includes("supplier")) counts.supplier++;
    if (types.includes("roaster")) counts.roaster++;
    if (types.includes("partner")) counts.partner++;
    if (types.includes("wholesale")) counts.wholesale++;
  }

  return NextResponse.json({
    contacts: contactsWithRoaster,
    total: count || 0,
    page,
    limit,
    counts,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      business_name,
      types,
      source,
      lead_status,
      business_id,
      role,
    } = body;

    if (!first_name && !last_name && !email) {
      return NextResponse.json(
        { error: "At least a name or email is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for duplicate by email within ghost_roastery contacts
    if (email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("owner_type", "ghost_roastery")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "A contact with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Find or create person record
    const peopleId = await findOrCreatePerson(
      supabase,
      email?.toLowerCase() || null,
      first_name,
      last_name,
      phone
    );

    const contactTypes = types || ["retail"];
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        owner_type: "ghost_roastery",
        roaster_id: null,
        first_name: first_name || "",
        last_name: last_name || "",
        email: email?.toLowerCase() || null,
        phone: phone || null,
        business_name: business_name || null,
        types: contactTypes,
        source: source || "manual",
        lead_status: contactTypes.includes("lead") ? (lead_status || "new") : null,
        business_id: business_id || null,
        role: role || null,
        people_id: peopleId,
        contact_type: resolvePrimaryContactType(contactTypes),
      })
      .select()
      .single();

    if (error) {
      console.error("Admin contact create error:", error);
      return NextResponse.json(
        { error: "Failed to create contact" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("contact_activity").insert({
      contact_id: contact.id,
      activity_type: "contact_created",
      description: "Contact created by admin",
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Admin contact create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
