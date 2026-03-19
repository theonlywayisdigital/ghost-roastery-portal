import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.includes("admin");
  const isRoaster = user.roles.includes("roaster");

  if (!isAdmin && !isRoaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // Find all invoices that are sent, viewed, or partially_paid and past due date
    let query = supabase
      .from("invoices")
      .select("id")
      .in("status", ["sent", "viewed", "partially_paid"])
      .lt("payment_due_date", today);

    // Roasters can only update their own invoices
    if (isRoaster && !isAdmin) {
      query = query.eq("roaster_id", user.roaster?.id || "");
    }

    const { data: overdueInvoices, error: fetchError } = await query;

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
