import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendInvoiceReminderEmail } from "@/lib/email";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";

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

    // Access control: roaster can only send reminders for their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Can only send reminder for sent, viewed, or overdue invoices
    const remindableStatuses = ["sent", "viewed", "overdue", "partially_paid"];
    if (!remindableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        {
          error: `Cannot send reminder for invoice with status "${invoice.status}"`,
        },
        { status: 400 }
      );
    }

    // Resolve customer email and name
    let customerEmail: string | null = null;
    let customerName = "Customer";

    if (invoice.customer_id) {
      const { data: person } = await supabase
        .from("people")
        .select("first_name, last_name, email")
        .eq("id", invoice.customer_id)
        .single();

      if (person) {
        customerName = `${person.first_name} ${person.last_name}`.trim();
        customerEmail = person.email;
      }
    }

    if (!customerEmail && invoice.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name, email")
        .eq("id", invoice.business_id)
        .single();

      if (business) {
        if (!customerEmail && business.email) {
          customerEmail = business.email;
        }
        if (customerName === "Customer" && business.name) {
          customerName = business.name;
        }
      }
    }

    // Resolve owner details
    let ownerName = "Roastery Platform";
    let ownerEmail = "";
    let vatNumber: string | null = null;
    let bankName: string | null = null;
    let bankAccountNumber: string | null = null;
    let bankSortCode: string | null = null;
    let paymentInstructions: string | null = null;
    let branding: { logoUrl?: string | null; primaryColour?: string; accentColour?: string; headingFont?: string; bodyFont?: string; businessName?: string } = {};

    if (invoice.owner_type === "roaster" && invoice.roaster_id) {
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

    const now = new Date().toISOString();

    // Update reminder_sent_at
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        reminder_sent_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating reminder timestamp:", updateError);
      return NextResponse.json(
        { error: "Failed to send reminder" },
        { status: 500 }
      );
    }

    // Fetch line items for PDF
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true });

    // Send reminder email if we have a customer email
    if (customerEmail) {
      try {
        const mappedLineItems = (lineItems || []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }));

        const pdfAttachment = await generateInvoiceAttachment({
          ownerName,
          ownerAddress: "",
          ownerEmail,
          vatNumber,
          customerName,
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
          amountPaid: Number(invoice.amount_paid || 0),
          notes: invoice.notes || null,
          status: invoice.status,
          currency: invoice.currency || "GBP",
          branding,
          bankName,
          bankAccountNumber,
          bankSortCode,
          paymentInstructions,
        }).catch((err) => {
          console.error("Failed to generate invoice PDF:", err);
          return null;
        });

        await sendInvoiceReminderEmail({
          to: customerEmail,
          customerName,
          ownerName,
          invoiceNumber: invoice.invoice_number,
          total: Number(invoice.total),
          amountDue: Number(invoice.amount_due ?? invoice.total),
          currency: invoice.currency || "GBP",
          dueDate: invoice.payment_due_date || null,
          accessToken: invoice.invoice_access_token,
          stripePaymentLinkUrl: invoice.stripe_payment_link_url || null,
          branding,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        });
      } catch (emailError) {
        console.error("Error sending reminder email:", emailError);
        // Don't fail the request if email fails — timestamp is already updated
      }
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      email_sent: !!customerEmail,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
