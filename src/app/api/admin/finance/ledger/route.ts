import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = parseInt(params.get("page") || "1");
  const pageSize = parseInt(params.get("pageSize") || "25");
  const orderType = params.get("orderType") || "";
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  const roasterId = params.get("roasterId") || "";
  const status = params.get("status") || "";

  const supabase = createServerClient();

  try {
    let query = supabase
      .from("platform_fee_ledger")
      .select("*, partner_roasters(business_name)", { count: "exact" });

    if (orderType) query = query.eq("order_type", orderType);
    if (status) query = query.eq("status", status);
    if (roasterId) query = query.eq("roaster_id", roasterId);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    query = query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Ledger query error:", error);
      return NextResponse.json(
        { error: "Failed to load ledger." },
        { status: 500 }
      );
    }

    const entries = (data || []).map((e) => ({
      ...e,
      roaster_name:
        (e.partner_roasters as { business_name: string } | null)
          ?.business_name || null,
      partner_roasters: undefined,
    }));

    return NextResponse.json({
      data: entries,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Ledger error:", error);
    return NextResponse.json(
      { error: "Failed to load ledger." },
      { status: 500 }
    );
  }
}
