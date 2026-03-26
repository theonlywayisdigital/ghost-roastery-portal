import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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
  const industry = searchParams.get("industry") || "";
  const roasterId = searchParams.get("roasterId") || "";
  const sort = searchParams.get("sort") || "last_activity_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("businesses")
    .select("*", { count: "exact" })
    .eq("owner_type", ownerType);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (type) {
    query = query.contains("types", [type]);
  }

  if (industry) {
    query = query.eq("industry", industry);
  }

  if (roasterId && ownerType === "roaster") {
    query = query.eq("roaster_id", roasterId);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,industry.ilike.%${search}%`
    );
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: businesses, error, count } = await query;

  if (error) {
    console.error("Admin businesses fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 }
    );
  }

  // Get primary contact for each business
  const businessIds = (businesses || []).map((b) => b.id);
  const contactsByBusiness: Record<string, { first_name: string; last_name: string; email: string | null }> = {};

  if (businessIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("business_id, first_name, last_name, email")
      .in("business_id", businessIds)
      .order("created_at", { ascending: true });

    if (contacts) {
      for (const c of contacts) {
        if (c.business_id && !contactsByBusiness[c.business_id]) {
          contactsByBusiness[c.business_id] = {
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
          };
        }
      }
    }
  }

  // For roaster tab, fetch roaster names
  let businessesWithExtra = (businesses || []).map((b) => ({
    ...b,
    primary_contact: contactsByBusiness[b.id] || null,
    roasterName: null as string | null,
  }));

  if (ownerType === "roaster") {
    const roasterIds = Array.from(new Set((businesses || []).map((b) => b.roaster_id).filter(Boolean)));
    if (roasterIds.length > 0) {
      const { data: roasters } = await supabase
        .from("partner_roasters")
        .select("id, business_name")
        .in("id", roasterIds as string[]);

      const roasterMap = new Map((roasters || []).map((r) => [r.id, r.business_name]));
      businessesWithExtra = businessesWithExtra.map((b) => ({
        ...b,
        roasterName: b.roaster_id ? roasterMap.get(b.roaster_id) || null : null,
      }));
    }
  }

  // Get tab counts
  const { data: allBusinesses } = await supabase
    .from("businesses")
    .select("types, status")
    .eq("owner_type", ownerType)
    .neq("status", "archived");

  const counts = {
    all: 0,
    retail: 0,
    supplier: 0,
    lead: 0,
    wholesale: 0,
  };

  for (const b of allBusinesses || []) {
    counts.all++;
    const types = (b.types as string[]) || [];
    if (types.includes("retail")) counts.retail++;
    if (types.includes("supplier")) counts.supplier++;
    if (types.includes("lead")) counts.lead++;
    if (types.includes("wholesale")) counts.wholesale++;
  }

  return NextResponse.json({
    businesses: businessesWithExtra,
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
      name, types, industry, email, phone, website,
      address_line_1, address_line_2, city, county, postcode, country,
      notes, source, status: bizStatus,
      primary_contact,
      pipeline_stage,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for duplicate by name within ghost_roastery
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_type", "ghost_roastery")
      .ilike("name", name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A business with this name already exists" },
        { status: 400 }
      );
    }

    const bizTypes = types || ["retail"];
    const { data: business, error } = await supabase
      .from("businesses")
      .insert({
        owner_type: "ghost_roastery",
        roaster_id: null,
        name: name.trim(),
        types: bizTypes,
        industry: industry || null,
        email: email?.toLowerCase() || null,
        phone: phone || null,
        website: website || null,
        address_line_1: address_line_1 || null,
        address_line_2: address_line_2 || null,
        city: city || null,
        county: county || null,
        postcode: postcode || null,
        country: country || "GB",
        notes: notes || null,
        source: source || "manual",
        status: bizStatus || "active",
        pipeline_stage: pipeline_stage || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Admin business create error:", error);
      return NextResponse.json(
        { error: "Failed to create business" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("business_activity").insert({
      business_id: business.id,
      author_id: user.id,
      activity_type: "business_created",
      description: "Business created by admin",
    });

    // Create primary contact if provided
    let contact = null;
    if (primary_contact && primary_contact.first_name) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          owner_type: "ghost_roastery",
          roaster_id: null,
          first_name: primary_contact.first_name,
          last_name: primary_contact.last_name || "",
          email: primary_contact.email || null,
          phone: primary_contact.phone || null,
          business_id: business.id,
          business_name: name.trim(),
          role: primary_contact.role || null,
          types: bizTypes,
          source: "manual",
          status: "active",
        })
        .select()
        .single();

      if (!contactError && newContact) {
        contact = newContact;

        await supabase.from("business_activity").insert({
          business_id: business.id,
          author_id: user.id,
          activity_type: "contact_added",
          description: `Primary contact ${primary_contact.first_name} ${primary_contact.last_name || ""} added`.trim(),
          metadata: { contact_id: newContact.id },
        });

        await supabase.from("contact_activity").insert({
          contact_id: newContact.id,
          activity_type: "contact_created",
          description: `Contact created and linked to ${name.trim()}`,
          metadata: { business_id: business.id },
        });
      }
    }

    return NextResponse.json({ business, contact });
  } catch (error) {
    console.error("Admin business create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
