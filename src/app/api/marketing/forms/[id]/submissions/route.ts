import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  // Verify ownership
  const { data: form } = await applyOwnerFilter(
    supabase.from("forms").select("id").eq("id", id),
    owner
  ).single();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  let query = supabase
    .from("form_submissions")
    .select("*, contacts(id, first_name, last_name, email)", { count: "exact" })
    .eq("form_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "verified") {
    query = query.eq("email_verified", true);
  } else if (status === "pending") {
    query = query.eq("email_verified", false).not("verification_token", "is", null);
  }

  if (search) {
    query = query.or(`data->>email.ilike.%${search}%,data->>name.ilike.%${search}%,data->>first_name.ilike.%${search}%`);
  }

  const { data: submissions, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  return NextResponse.json({
    submissions: submissions || [],
    total: count || 0,
    page,
    limit,
  });
}
