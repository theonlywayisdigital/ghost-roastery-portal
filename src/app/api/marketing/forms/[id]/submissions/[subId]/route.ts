import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, subId } = await params;
  const supabase = createServerClient();

  // Verify form ownership
  const { data: form } = await applyOwnerFilter(
    supabase.from("forms").select("id").eq("id", id),
    owner
  ).single();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // Decrement submission count
  const { data: currentForm } = await supabase
    .from("forms")
    .select("submission_count")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("form_submissions")
    .delete()
    .eq("id", subId)
    .eq("form_id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }

  if (currentForm) {
    await supabase
      .from("forms")
      .update({ submission_count: Math.max(0, (currentForm.submission_count || 0) - 1) })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
