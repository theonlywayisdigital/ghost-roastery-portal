import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Fetch the batch to check current status
    const { data: batch, error: batchError } = await supabase
      .from("partner_payout_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }

    if (batch.status !== "draft" && batch.status !== "reviewing") {
      return NextResponse.json(
        {
          error: `Cannot approve batch with status '${batch.status}'. Only 'draft' or 'reviewing' batches can be approved.`,
        },
        { status: 400 }
      );
    }

    const { data: updatedBatch, error: updateError } = await supabase
      .from("partner_payout_batches")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error approving batch:", updateError);
      return NextResponse.json(
        { error: "Failed to approve batch" },
        { status: 500 }
      );
    }

    return NextResponse.json({ batch: updatedBatch });
  } catch (error) {
    console.error("Approve batch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
