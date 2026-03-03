import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { fireAutomationTrigger } from "@/lib/automation-triggers";
import { findOrCreatePerson, resolvePrimaryContactType } from "@/lib/people";

export async function GET(request: NextRequest) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "active";
  const leadStatus = searchParams.get("lead_status") || "";
  const sort = searchParams.get("sort") || "last_activity_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("contacts")
    .select("*, businesses(id, name)", { count: "exact" })
    .eq("roaster_id", roaster.id);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (type) {
    query = query.contains("types", [type]);
  }

  if (leadStatus) {
    query = query.eq("lead_status", leadStatus);
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
    console.error("Contacts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }

  // Get tab counts
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("types, status")
    .eq("roaster_id", roaster.id)
    .neq("status", "archived");

  const counts = {
    all: 0,
    wholesale: 0,
    customer: 0,
    supplier: 0,
    lead: 0,
  };

  for (const c of allContacts || []) {
    counts.all++;
    const types = (c.types as string[]) || [];
    if (types.includes("wholesale")) counts.wholesale++;
    if (types.includes("customer")) counts.customer++;
    if (types.includes("supplier")) counts.supplier++;
    if (types.includes("lead")) counts.lead++;
  }

  return NextResponse.json({
    contacts: contacts || [],
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

    // Check for duplicate by email
    if (email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("roaster_id", roaster.id)
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

    const contactTypes = types || ["customer"];
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        roaster_id: roaster.id,
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
        owner_id: roaster.id,
        contact_type: resolvePrimaryContactType(contactTypes),
      })
      .select()
      .single();

    if (error) {
      console.error("Contact create error:", error);
      return NextResponse.json(
        { error: "Failed to create contact" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("contact_activity").insert({
      contact_id: contact.id,
      activity_type: "contact_created",
      description: `Contact created manually`,
    });

    // Fire automation triggers
    fireAutomationTrigger({
      trigger_type: "contact_created",
      roaster_id: roaster.id as string,
      contact_id: contact.id,
      event_data: { source: source || "manual" },
    }).catch(() => {});

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Contact create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
