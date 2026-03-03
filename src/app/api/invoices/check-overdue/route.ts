import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // Find all invoices that are sent or viewed and past due date
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select("id")
      .in("status", ["sent", "viewed"])
      .lt("payment_due_date", today);

    if (fetchError) {
      console.error("Error fetching overdue invoices:", fetchError);
      return NextResponse.json(
        { error: "Failed to check overdue invoices" },
        { status: 500 }
      );
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const overdueIds = overdueInvoices.map((inv) => inv.id);

    // Update them to overdue status
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "overdue",
        payment_status: "overdue",
      })
      .in("id", overdueIds);

    if (updateError) {
      console.error("Error updating overdue invoices:", updateError);
      return NextResponse.json(
        { error: "Failed to update overdue invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: overdueIds.length,
    });
  } catch (error) {
    console.error("Check overdue error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
