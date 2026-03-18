import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;
  const supabase = createServerClient();

  // Look up roaster by domain
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("id")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Upsert into contacts as a newsletter subscriber
  const { error } = await supabase.from("contacts").upsert(
    {
      roaster_id: roaster.id,
      email,
      contact_type: "retail",
      tags: ["newsletter"],
      status: "active",
    },
    { onConflict: "roaster_id,email" }
  );

  if (error) {
    // Table may not have the right schema — return success anyway for UX
    return NextResponse.json({ success: true, stored: false });
  }

  return NextResponse.json({ success: true });
}
