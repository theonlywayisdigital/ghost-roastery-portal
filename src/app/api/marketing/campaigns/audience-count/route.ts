import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const audienceType = searchParams.get("audience_type");
  const formIdsParam = searchParams.get("form_ids");

  if (audienceType !== "form_submissions") {
    return NextResponse.json(
      { error: "Count preview only supported for form_submissions at this time" },
      { status: 400 }
    );
  }

  const formIds = formIdsParam ? formIdsParam.split(",").filter(Boolean) : [];
  if (formIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const supabase = createServerClient();

  // Step 1: distinct verified contact IDs from form_submissions
  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("contact_id")
    .in("form_id", formIds)
    .not("contact_id", "is", null)
    .eq("email_verified", true);

  const contactIds = Array.from(
    new Set(
      (submissions || [])
        .map((s) => s.contact_id)
        .filter(Boolean) as string[]
    )
  );

  if (contactIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // Step 2: count contacts with standard consent filters
  const { count } = await applyOwnerFilter(
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .in("id", contactIds)
      .eq("status", "active")
      .not("email", "is", null)
      .eq("unsubscribed", false)
      .eq("marketing_consent", true),
    owner
  );

  return NextResponse.json({ count: count || 0 });
}
