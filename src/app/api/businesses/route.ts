import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger } from "@/lib/automation-triggers";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "active";
  const industry = searchParams.get("industry") || "";
  const sort = searchParams.get("sort") || "last_activity_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("businesses")
    .select("*", { count: "exact" })
    .eq("roaster_id", roaster.id);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (type) {
    query = query.contains("types", [type]);
  }

  if (industry) {
    query = query.eq("industry", industry);
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
    console.error("Businesses fetch error:", error);
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

  const businessesWithContacts = (businesses || []).map((b) => ({
    ...b,
    primary_contact: contactsByBusiness[b.id] || null,
  }));

  // Get tab counts
  const { data: allBusinesses } = await supabase
    .from("businesses")
    .select("types, status")
    .eq("roaster_id", roaster.id)
    .neq("status", "archived");

  const counts = {
    all: 0,
    wholesale: 0,
    retail: 0,
    supplier: 0,
    lead: 0,
  };

  for (const b of allBusinesses || []) {
    counts.all++;
    const types = (b.types as string[]) || [];
    if (types.includes("wholesale")) counts.wholesale++;
    if (types.includes("retail")) counts.retail++;
    if (types.includes("supplier")) counts.supplier++;
    if (types.includes("lead")) counts.lead++;
  }

  return NextResponse.json({
    businesses: businessesWithContacts,
    total: count || 0,
    page,
    limit,
    counts,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name, types, industry, email, phone, website,
      address_line_1, address_line_2, city, county, postcode, country,
      notes, source, status: bizStatus,
      primary_contact,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check for duplicate by name
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("roaster_id", roaster.id)
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
        roaster_id: roaster.id,
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
      })
      .select()
      .single();

    if (error) {
      console.error("Business create error:", error);
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
      description: "Business created manually",
    });

    // Create primary contact if provided
    let contact = null;
    if (primary_contact && primary_contact.first_name) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          roaster_id: roaster.id,
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

        // Log contact activity on the business
        await supabase.from("business_activity").insert({
          business_id: business.id,
          author_id: user.id,
          activity_type: "contact_added",
          description: `Primary contact ${primary_contact.first_name} ${primary_contact.last_name || ""} added`.trim(),
          metadata: { contact_id: newContact.id },
        });

        // Log activity on the contact
        await supabase.from("contact_activity").insert({
          contact_id: newContact.id,
          activity_type: "contact_created",
          description: `Contact created and linked to ${name.trim()}`,
          metadata: { business_id: business.id },
        });
      }
    }

    // Fire automation triggers — business_created and contact_created for primary
    if (contact) {
      fireAutomationTrigger({
        trigger_type: "business_created",
        roaster_id: roaster.id as string,
        contact_id: contact.id,
      }).catch(() => {});

      fireAutomationTrigger({
        trigger_type: "contact_created",
        roaster_id: roaster.id as string,
        contact_id: contact.id,
        event_data: { source: "manual" },
      }).catch(() => {});
    }

    return NextResponse.json({ business, contact });
  } catch (error) {
    console.error("Business create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
