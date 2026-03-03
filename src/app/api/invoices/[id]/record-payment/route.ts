import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { amount, payment_method, reference, notes } = body as {
      amount: number;
      payment_method: string;
      reference?: string;
      notes?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "A valid payment amount is required" },
        { status: 400 }
      );
    }

    if (!payment_method) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 }
      );
    }

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

    // Access control: roaster can only record payments on their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot record payment on void/cancelled invoices
    if (invoice.status === "void" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot record payment on a void or cancelled invoice" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: id,
        amount,
        payment_method,
        reference: reference || null,
        notes: notes || null,
        recorded_by: user.id,
        paid_at: now,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 }
      );
    }

    // Calculate new amount_paid
    const newAmountPaid =
      Math.round(((invoice.amount_paid || 0) + amount) * 100) / 100;

    // Determine new status based on payment
    let newStatus: string;
    let newPaymentStatus: string;
    let paidAt: string | null = invoice.paid_at;

    if (newAmountPaid >= invoice.total) {
      newStatus = "paid";
      newPaymentStatus = "paid";
      paidAt = now;
    } else {
      newStatus = "partially_paid";
      newPaymentStatus = "partially_paid";
    }

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        amount_due: Math.round((invoice.total - newAmountPaid) * 100) / 100,
        status: newStatus,
        payment_status: newPaymentStatus,
        paid_at: paidAt,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating invoice after payment:", updateError);
      return NextResponse.json(
        { error: "Payment recorded but invoice update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
