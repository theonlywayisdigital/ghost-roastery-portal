import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendInvoiceReminderEmail } from "@/lib/email";

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

    // Resolve owner name
    let ownerName = "Ghost Roastery";
    if (invoice.owner_type === "roaster" && invoice.roaster_id) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("business_name")
        .eq("id", invoice.roaster_id)
        .single();

      if (roaster?.business_name) {
        ownerName = roaster.business_name;
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

    // Send reminder email if we have a customer email
    if (customerEmail) {
      try {
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
