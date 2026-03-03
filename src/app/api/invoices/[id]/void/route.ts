import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.includes("admin");
  const isRoaster = user.roles.includes("roaster");

  if (!isAdmin && !isRoaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Fetch the invoice
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Access control: roaster can only void their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot void an already void or paid invoice
    if (invoice.status === "void") {
      return NextResponse.json(
        { error: "Invoice is already void" },
        { status: 400 }
      );
    }
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot void a paid invoice" },
        { status: 400 }
      );
    }

    // Set status to void
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "void",
        payment_status: "cancelled",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error voiding invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to void invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Void invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
