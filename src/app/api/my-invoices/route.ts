import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const status = params.get("status") || "";

  const supabase = createServerClient();

  try {
    // Find the user's people record via profile
    let peopleId: string | null = user.profile?.people_id || null;

    // If no people_id in profile, try to find via email
    if (!peopleId) {
      const { data: person } = await supabase
        .from("people")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      peopleId = person?.id || null;
    }

    // Build OR filter: buyer_id matches auth user ID, or customer_id matches people record
    const orConditions: string[] = [];
    orConditions.push(`buyer_id.eq.${user.id}`);
    if (peopleId) {
      orConditions.push(`customer_id.eq.${peopleId}`);
    }

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .or(orConditions.join(","));

    // Only show invoices that have been sent (not drafts)
    query = query.not("status", "eq", "draft");

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: invoices, count, error } = await query;

    if (error) {
      console.error("Error fetching my invoices:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Join business names for display
    const businessIds = Array.from(
      new Set(
        (invoices || [])
          .map((inv) => inv.business_id)
          .filter(Boolean) as string[]
      )
    );

    let businessMap = new Map<string, string>();
    if (businessIds.length > 0) {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", businessIds);

      businessMap = new Map(
        (businesses || []).map((b) => [b.id, b.name])
      );
    }

    // Join roaster names for display
    const roasterIds = Array.from(
      new Set(
        (invoices || [])
          .map((inv) => inv.roaster_id)
          .filter(Boolean) as string[]
      )
    );

    let roasterMap = new Map<string, string>();
    if (roasterIds.length > 0) {
      const { data: roasters } = await supabase
        .from("roasters")
        .select("id, business_name")
        .in("id", roasterIds);

      roasterMap = new Map(
        (roasters || []).map((r) => [r.id, r.business_name])
      );
    }

    const enrichedInvoices = (invoices || []).map((inv) => ({
      ...inv,
      business_name: inv.business_id
        ? businessMap.get(inv.business_id) || null
        : null,
      roaster_name: inv.roaster_id
        ? roasterMap.get(inv.roaster_id) || null
        : null,
    }));

    return NextResponse.json({
      data: enrichedInvoices,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("My invoices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
