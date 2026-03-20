import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST — trigger domain verification
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { domainId } = body as { domainId?: string };

  if (!domainId) {
    return NextResponse.json({ error: "Domain ID is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch the domain record
  const { data: emailDomain } = await supabase
    .from("roaster_email_domains")
    .select("*")
    .eq("id", domainId)
    .eq("roaster_id", roaster.id)
    .single();

  if (!emailDomain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (!emailDomain.resend_domain_id) {
    return NextResponse.json({ error: "Domain not registered with email provider" }, { status: 400 });
  }

  try {
    // Trigger verification in Resend
    await resend.domains.verify(emailDomain.resend_domain_id);

    // Fetch updated domain status from Resend
    const resendDomain = await resend.domains.get(emailDomain.resend_domain_id);

    if (!resendDomain.data) {
      return NextResponse.json({ error: "Failed to fetch domain status" }, { status: 500 });
    }

    const isVerified = resendDomain.data.status === "verified";

    // Update local record
    const { data: updated, error: updateError } = await supabase
      .from("roaster_email_domains")
      .update({
        status: resendDomain.data.status || emailDomain.status,
        dns_records: resendDomain.data.records || emailDomain.dns_records,
        verified_at: isVerified ? new Date().toISOString() : null,
      })
      .eq("id", domainId)
      .select()
      .single();

    if (updateError) {
      console.error("Update email domain error:", updateError);
      return NextResponse.json({ error: "Failed to update domain status" }, { status: 500 });
    }

    return NextResponse.json({ domain: updated });
  } catch (error) {
    console.error("Verify email domain error:", error);
    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}
