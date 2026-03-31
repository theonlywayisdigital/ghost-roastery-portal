import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendInvoiceReminderEmail } from "@/lib/email";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Find all invoices that are past due and not yet marked overdue
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select("id")
      .in("status", ["sent", "viewed", "partially_paid"])
      .lt("payment_due_date", today);

    if (fetchError) {
      console.error("Error fetching overdue invoices:", fetchError);
      return NextResponse.json(
        { error: "Failed to check overdue invoices" },
        { status: 500 }
      );
    }

    let markedOverdue = 0;
    if (overdueInvoices && overdueInvoices.length > 0) {
      const overdueIds = overdueInvoices.map((inv) => inv.id);

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "overdue",
          payment_status: "overdue",
        })
        .in("id", overdueIds);

      if (updateError) {
        console.error("Error updating overdue invoices:", updateError);
      } else {
        markedOverdue = overdueIds.length;
      }
    }

    // 2. Send reminders for overdue invoices where roaster has reminders enabled
    //    and reminder_sent_at is null
    const { data: invoicesNeedingReminder } = await supabase
      .from("invoices")
      .select("id, invoice_number, roaster_id, owner_type, customer_id, business_id, subtotal, tax_rate, tax_amount, discount_amount, total, amount_paid, amount_due, currency, notes, status, issued_date, created_at, payment_due_date, invoice_access_token, stripe_payment_link_url")
      .eq("status", "overdue")
      .is("reminder_sent_at", null)
      .not("roaster_id", "is", null);

    let remindersSent = 0;

    if (invoicesNeedingReminder && invoicesNeedingReminder.length > 0) {
      // Fetch roasters with reminder enabled
      const roasterIds = Array.from(
        new Set(
          invoicesNeedingReminder
            .map((inv) => inv.roaster_id)
            .filter(Boolean) as string[]
        )
      );

      const { data: roasters } = await supabase
        .from("roasters")
        .select("id, invoice_reminder_enabled, business_name, email, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions")
        .in("id", roasterIds);

      const roasterMap = new Map(
        (roasters || []).map((r) => [r.id, r])
      );

      for (const invoice of invoicesNeedingReminder) {
        const roaster = roasterMap.get(invoice.roaster_id!);
        if (!roaster || !roaster.invoice_reminder_enabled) continue;

        // Resolve customer email
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
          const { data: biz } = await supabase
            .from("businesses")
            .select("name, email")
            .eq("id", invoice.business_id)
            .single();
          if (biz) {
            if (biz.email) customerEmail = biz.email;
            if (customerName === "Customer" && biz.name) customerName = biz.name;
          }
        }

        if (!customerEmail) continue;

        try {
          const ownerName = roaster.business_name || "Roastery Platform";
          const branding = {
            logoUrl: roaster.brand_logo_url,
            logoSize: (roaster.storefront_logo_size as "small" | "medium" | "large") || "medium",
            buttonColour: roaster.storefront_button_colour || undefined,
            buttonTextColour: roaster.storefront_button_text_colour || undefined,
            buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
            primaryColour: roaster.brand_primary_colour || undefined,
            accentColour: roaster.brand_accent_colour || undefined,
            headingFont: roaster.brand_heading_font || undefined,
            bodyFont: roaster.brand_body_font || undefined,
            businessName: roaster.business_name || undefined,
          };

          // Fetch line items for PDF
          const { data: lineItems } = await supabase
            .from("invoice_line_items")
            .select("*")
            .eq("invoice_id", invoice.id)
            .order("sort_order", { ascending: true });

          const mappedLineItems = (lineItems || []).map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total: Number(item.total),
          }));

          const pdfAttachment = await generateInvoiceAttachment({
            ownerName,
            ownerAddress: "",
            ownerEmail: roaster.email || "",
            vatNumber: roaster.vat_number || null,
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
            status: "overdue",
            currency: invoice.currency || "GBP",
            branding,
            bankName: roaster.bank_name || null,
            bankAccountNumber: roaster.bank_account_number || null,
            bankSortCode: roaster.bank_sort_code || null,
            paymentInstructions: roaster.payment_instructions || null,
          }).catch(() => null);

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

          // Mark reminder as sent
          await supabase
            .from("invoices")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", invoice.id);

          remindersSent++;
        } catch (err) {
          console.error(`Failed to send reminder for invoice ${invoice.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      marked_overdue: markedOverdue,
      reminders_sent: remindersSent,
    });
  } catch (error) {
    console.error("Check overdue invoices cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
