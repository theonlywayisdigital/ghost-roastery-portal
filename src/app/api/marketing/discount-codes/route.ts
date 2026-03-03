import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  // Auto-expire codes where expires_at < now() and status is still active
  await applyOwnerFilter(
    supabase.from("discount_codes").update({ status: "expired" }),
    owner
  )
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  let query = applyOwnerFilter(
    supabase.from("discount_codes").select("*", { count: "exact" }),
    owner
  );

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

  const { data: codes, error, count } = await query;

  if (error) {
    console.error("Discount codes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 });
  }

  // Get status counts
  const { data: allCodes } = await applyOwnerFilter(
    supabase.from("discount_codes").select("status"),
    owner
  );

  const counts = { all: 0, active: 0, paused: 0, expired: 0, archived: 0 };
  for (const c of allCodes || []) {
    counts.all++;
    if (c.status === "active") counts.active++;
    if (c.status === "paused") counts.paused++;
    if (c.status === "expired") counts.expired++;
    if (c.status === "archived") counts.archived++;
  }

  return NextResponse.json({
    codes: codes || [],
    total: count || 0,
    page,
    limit,
    counts,
  });
}

export async function POST(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Validate and format code
    const code = (body.code || "").toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!/^[A-Z0-9-]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code can only contain letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check uniqueness
    const { data: existing } = await applyOwnerFilter(
      supabase.from("discount_codes").select("id"),
      owner
    )
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A discount code with this code already exists" },
        { status: 409 }
      );
    }

    // If auto_apply, check no other active auto_apply exists
    if (body.auto_apply) {
      const { data: autoApplyExisting } = await applyOwnerFilter(
        supabase.from("discount_codes").select("id"),
        owner
      )
        .eq("auto_apply", true)
        .eq("status", "active")
        .maybeSingle();

      if (autoApplyExisting) {
        return NextResponse.json(
          { error: "Only one auto-apply code can be active at a time" },
          { status: 400 }
        );
      }
    }

    const { data: discountCode, error } = await supabase
      .from("discount_codes")
      .insert({
        roaster_id: owner.owner_id,
        code,
        description: body.description || null,
        discount_type: body.discount_type || "percentage",
        discount_value: body.discount_value || 0,
        currency: body.currency || "GBP",
        minimum_order_value: body.minimum_order_value || null,
        maximum_discount: body.maximum_discount || null,
        applies_to: body.applies_to || "all_products",
        product_ids: body.product_ids || [],
        usage_limit: body.usage_limit || null,
        usage_per_customer: body.usage_per_customer ?? 1,
        starts_at: body.starts_at || null,
        expires_at: body.expires_at || null,
        status: body.status || "active",
        auto_apply: body.auto_apply || false,
        first_order_only: body.first_order_only || false,
        source: body.source || "manual",
        campaign_id: body.campaign_id || null,
        automation_id: body.automation_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Discount code create error:", error);
      return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 });
    }

    return NextResponse.json({ code: discountCode });
  } catch (error) {
    console.error("Discount code create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
