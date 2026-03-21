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
    // Trigger verification in Resend (async — kicks off DNS check)
    await resend.domains.verify(emailDomain.resend_domain_id);

    // Poll for updated status — verify() is async on Resend's side,
    // so the status won't change immediately. Poll up to 4 times with
    // increasing delays to give Resend time to complete the DNS check.
    const delays = [1500, 2000, 2500, 3000];
    let finalStatus = emailDomain.status as string;
    let finalRecords = emailDomain.dns_records;

    for (const delay of delays) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      const resendDomain = await resend.domains.get(emailDomain.resend_domain_id);
      if (!resendDomain.data) continue;

      finalStatus = resendDomain.data.status;
      finalRecords = resendDomain.data.records || finalRecords;

      // Stop polling once we get a definitive result
      if (finalStatus === "verified" || finalStatus === "failed") break;
    }

    const isVerified = finalStatus === "verified";

    // Update local record
    const { data: updated, error: updateError } = await supabase
      .from("roaster_email_domains")
      .update({
        status: finalStatus,
        dns_records: finalRecords,
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
