import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason, admin_notes } = body;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "under_review", "approved", "rejected", "withdrawn"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch current application
    const { data: application, error: fetchError } = await supabase
      .from("partner_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    };

    if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    // Update application
    const { data: updated, error: updateError } = await supabase
      .from("partner_applications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Application update error:", updateError);
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    // On approval: enable ghost roaster on the roasters record
    if (status === "approved") {
      await supabase
        .from("roasters")
        .update({
          is_ghost_roaster: true,
          ghost_roaster_application_status: "approved",
          ghost_roaster_approved_at: new Date().toISOString(),
          is_verified: true,
        })
        .eq("id", application.roaster_id);
    }

    // On rejection: update application status on roaster
    if (status === "rejected") {
      await supabase
        .from("roasters")
        .update({
          ghost_roaster_application_status: "rejected",
        })
        .eq("id", application.roaster_id);
    }

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Application update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
