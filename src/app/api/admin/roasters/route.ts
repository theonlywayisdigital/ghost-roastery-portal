import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "active";
  const partnerStatus = searchParams.get("partnerStatus") || "";
  const stripeStatus = searchParams.get("stripeStatus") || "";
  const country = searchParams.get("country") || "";
  const strikes = searchParams.get("strikes") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  let query = supabase
    .from("partner_roasters")
    .select("*", { count: "exact" });

  if (status && status !== "all") {
    query = query.eq("is_active", status === "active");
  }

  if (partnerStatus) {
    query = query.eq("ghost_roaster_application_status", partnerStatus);
  }

  if (stripeStatus) {
    if (stripeStatus === "none") {
      query = query.is("stripe_account_id", null);
    } else if (stripeStatus === "pending") {
      query = query.not("stripe_account_id", "is", null).eq("stripe_onboarding_complete", false);
    } else if (stripeStatus === "complete") {
      query = query.eq("stripe_onboarding_complete", true);
    }
  }

  if (country) {
    query = query.eq("country", country);
  }

  if (strikes) {
    query = query.eq("strikes", parseInt(strikes));
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: roasters, error, count } = await query;

  if (error) {
    console.error("Admin roasters fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roasters" },
      { status: 500 }
    );
  }

  // Fetch order counts and revenue for the returned roasters
  const roasterIds = (roasters || []).map((r) => r.id);
  const orderStatsMap: Record<string, { order_count: number; revenue: number }> = {};

  if (roasterIds.length > 0) {
    const { data: orderStats } = await supabase
      .from("wholesale_orders")
      .select("roaster_id, subtotal")
      .in("roaster_id", roasterIds);

    if (orderStats) {
      for (const row of orderStats) {
        if (!orderStatsMap[row.roaster_id]) {
          orderStatsMap[row.roaster_id] = { order_count: 0, revenue: 0 };
        }
        orderStatsMap[row.roaster_id].order_count += 1;
        orderStatsMap[row.roaster_id].revenue += row.subtotal || 0;
      }
    }
  }

  const roastersWithStats = (roasters || []).map((r) => ({
    ...r,
    order_count: orderStatsMap[r.id]?.order_count || 0,
    revenue: orderStatsMap[r.id]?.revenue || 0,
  }));

  return NextResponse.json({
    roasters: roastersWithStats,
    total: count || 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { business_name, contact_name, email, phone, website, country } = body;

    if (!business_name || !business_name.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Generate slug from business_name
    const slug = business_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("partner_roasters")
      .select("id")
      .eq("roaster_slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A roaster with this name already exists" },
        { status: 400 }
      );
    }

    const { data: roaster, error } = await supabase
      .from("partner_roasters")
      .insert({
        business_name: business_name.trim(),
        contact_name: contact_name || null,
        email: email?.toLowerCase() || null,
        phone: phone || null,
        website: website || null,
        country: country || "UK",
        roaster_slug: slug,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Admin roaster create error:", error);
      return NextResponse.json(
        { error: "Failed to create roaster" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("roaster_activity").insert({
      roaster_id: roaster.id,
      author_id: user.id,
      activity_type: "roaster_created",
      description: "Roaster created by admin",
    });

    return NextResponse.json({ roaster });
  } catch (error) {
    console.error("Admin roaster create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
