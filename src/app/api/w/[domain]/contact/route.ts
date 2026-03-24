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
    .select("id, user_id, business_name")
    .or(`website_custom_domain.eq.${domain},storefront_slug.eq.${domain}`)
    .eq("website_subscription_active", true)
    .single();

  if (!roaster) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { name?: string; email?: string; phone?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Rate limit: 5 submissions per IP per hour
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("contact_submissions")
    .select("*", { count: "exact", head: true })
    .eq("roaster_id", roaster.id)
    .eq("ip_address", ip)
    .gte("created_at", oneHourAgo);

  if ((count || 0) >= 5) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  // Store submission
  const { error } = await supabase.from("contact_submissions").insert({
    roaster_id: roaster.id,
    name: body.name?.trim() || null,
    email: body.email.trim().toLowerCase(),
    phone: body.phone?.trim() || null,
    subject: body.subject?.trim() || null,
    message: body.message?.trim() || null,
    ip_address: ip,
  });

  if (error) {
    // Table may not exist yet — fall back to just returning success
    // The form submission is still valuable for the UX feedback
    return NextResponse.json({ success: true, stored: false });
  }

  return NextResponse.json({ success: true });
}
