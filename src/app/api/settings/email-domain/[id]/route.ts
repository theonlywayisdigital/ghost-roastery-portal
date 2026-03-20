import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// PATCH — update sender prefix
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { senderPrefix } = body as { senderPrefix?: string };

  if (!senderPrefix || typeof senderPrefix !== "string") {
    return NextResponse.json({ error: "Sender prefix is required" }, { status: 400 });
  }

  // Validate sender prefix (alphanumeric, dots, hyphens, underscores)
  const cleanPrefix = senderPrefix.toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(cleanPrefix)) {
    return NextResponse.json(
      { error: "Invalid sender prefix. Use letters, numbers, dots, hyphens, or underscores." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: updated, error } = await supabase
    .from("roaster_email_domains")
    .update({ sender_prefix: cleanPrefix })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Domain not found or update failed" }, { status: 404 });
  }

  return NextResponse.json({ domain: updated });
}

// DELETE — remove a custom domain
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const roaster = await getCurrentRoaster();
  if (!user || !roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  // Fetch the domain first to get resend_domain_id
  const { data: emailDomain } = await supabase
    .from("roaster_email_domains")
    .select("resend_domain_id")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!emailDomain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  // Remove from Resend
  if (emailDomain.resend_domain_id) {
    try {
      await resend.domains.remove(emailDomain.resend_domain_id);
    } catch (error) {
      console.error("Resend domain remove error:", error);
      // Continue with local deletion even if Resend fails
    }
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("roaster_email_domains")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (deleteError) {
    console.error("Delete email domain error:", deleteError);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
