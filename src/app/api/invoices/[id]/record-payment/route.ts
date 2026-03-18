import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendInvoicePaymentConfirmationEmail } from "@/lib/email";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";

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
    const isFullyPaid = newAmountPaid >= invoice.total;

    if (isFullyPaid) {
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

    // ─── On full payment: auto-confirm linked orders + send confirmation email ───
    if (isFullyPaid) {
      const actorName = isRoaster ? (user.roaster?.business_name as string || "Roaster") : "Admin";

      // Auto-confirm pending orders linked to this invoice
      const orderIds = Array.isArray(invoice.order_ids) ? invoice.order_ids as string[] : [];
      for (const orderId of orderIds) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, status, order_channel")
          .eq("id", orderId)
          .single();

        if (order && order.status === "pending") {
          await supabase
            .from("orders")
            .update({ status: "confirmed", confirmed_at: now })
            .eq("id", orderId);

          await supabase.from("order_activity_log").insert({
            order_id: orderId,
            order_type: order.order_channel || "wholesale",
            action: "status_change",
            description: `Status changed to Confirmed — invoice ${invoice.invoice_number} paid in full`,
            actor_id: user.id,
            actor_name: actorName,
          });
        }
      }

      // Send payment confirmation email to buyer
      let buyerEmail: string | null = null;
      let buyerName = "Customer";

      if (invoice.customer_id) {
        const { data: person } = await supabase
          .from("people")
          .select("first_name, last_name, email")
          .eq("id", invoice.customer_id)
          .single();
        if (person) {
          buyerName = `${person.first_name} ${person.last_name}`.trim();
          buyerEmail = person.email;
        }
      }

      if (!buyerEmail && invoice.business_id) {
        const { data: business } = await supabase
          .from("businesses")
          .select("name, email")
          .eq("id", invoice.business_id)
          .single();
        if (business) {
          if (!buyerEmail && business.email) buyerEmail = business.email;
          if (buyerName === "Customer" && business.name) buyerName = business.name;
        }
      }

      // If we still don't have an email, check linked orders for customer_email
      if (!buyerEmail && orderIds.length > 0) {
        const { data: linkedOrder } = await supabase
          .from("orders")
          .select("customer_email, customer_name")
          .eq("id", orderIds[0])
          .single();
        if (linkedOrder) {
          buyerEmail = linkedOrder.customer_email || null;
          if (buyerName === "Customer" && linkedOrder.customer_name) {
            buyerName = linkedOrder.customer_name;
          }
        }
      }

      if (buyerEmail) {
        // Fetch roaster details for branding + bank details
        let ownerName = "Ghost Roastery";
        let ownerEmail = "";
        let vatNumber: string | null = null;
        let bankName: string | null = null;
        let bankAccountNumber: string | null = null;
        let bankSortCode: string | null = null;
        let paymentInstructions: string | null = null;
        let branding: { logoUrl?: string | null; primaryColour?: string; accentColour?: string; headingFont?: string; bodyFont?: string; businessName?: string } = {};

        if (invoice.roaster_id) {
          const { data: roaster } = await supabase
            .from("partner_roasters")
            .select("business_name, email, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions")
            .eq("id", invoice.roaster_id)
            .single();

          if (roaster) {
            ownerName = roaster.business_name || ownerName;
            ownerEmail = roaster.email || "";
            vatNumber = roaster.vat_number || null;
            bankName = roaster.bank_name || null;
            bankAccountNumber = roaster.bank_account_number || null;
            bankSortCode = roaster.bank_sort_code || null;
            paymentInstructions = roaster.payment_instructions || null;
            branding = {
              logoUrl: roaster.brand_logo_url,
              primaryColour: roaster.brand_primary_colour || undefined,
              accentColour: roaster.brand_accent_colour || undefined,
              headingFont: roaster.brand_heading_font || undefined,
              bodyFont: roaster.brand_body_font || undefined,
              businessName: roaster.business_name || undefined,
            };
          }
        }

        // Fetch line items for PDF
        const { data: lineItems } = await supabase
          .from("invoice_line_items")
          .select("*")
          .eq("invoice_id", id)
          .order("sort_order", { ascending: true });

        const mappedLineItems = (lineItems || []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }));

        // Generate PAID PDF attachment
        const pdfAttachment = await generateInvoiceAttachment({
          ownerName,
          ownerAddress: "",
          ownerEmail,
          vatNumber,
          customerName: buyerName,
          customerAddress: null,
          invoiceNumber: invoice.invoice_number,
          issuedDate: invoice.issued_date || invoice.created_at,
          dueDate: invoice.payment_due_date || null,
          lineItems: mappedLineItems,
          subtotal: Number(invoice.subtotal),
          taxRate: Number(invoice.tax_rate || 0),
          taxAmount: Number(invoice.tax_amount || 0),
          discountAmount: Number(invoice.discount_amount || 0),
          total: Number(invoice.total),
          amountPaid: newAmountPaid,
          notes: invoice.notes || null,
          status: "paid",
          currency: invoice.currency || "GBP",
          branding,
          bankName,
          bankAccountNumber,
          bankSortCode,
          paymentInstructions,
        }).catch((err) => {
          console.error("Failed to generate paid invoice PDF:", err);
          return null;
        });

        sendInvoicePaymentConfirmationEmail({
          to: buyerEmail,
          customerName: buyerName,
          ownerName,
          invoiceNumber: invoice.invoice_number,
          total: Number(invoice.total),
          amountPaid: newAmountPaid,
          currency: invoice.currency || "GBP",
          branding,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        }).catch((err) => console.error("Failed to send payment confirmation email:", err));
      }
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
