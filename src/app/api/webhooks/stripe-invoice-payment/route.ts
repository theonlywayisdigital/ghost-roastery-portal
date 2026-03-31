import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";
import { sendInvoicePaymentConfirmationEmail } from "@/lib/email";
import type { EmailBranding } from "@/lib/email-template";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";
import { dispatchWebhook } from "@/lib/webhooks";
import { syncToXero, pushPaymentToXero } from "@/lib/xero";
import { syncToSage, pushPaymentToSage } from "@/lib/sage";
import { syncToQuickBooks, pushPaymentToQuickBooks } from "@/lib/quickbooks";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_INVOICE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Invoice webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    // Only process invoice payments
    if (metadata.type !== "invoice_payment" || !metadata.invoice_id) {
      return NextResponse.json({ received: true });
    }

    const invoiceId = metadata.invoice_id;
    const supabase = createServerClient();

    try {
      // Fetch the invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (!invoice) {
        console.error("Invoice not found for payment webhook:", invoiceId);
        return NextResponse.json({ received: true });
      }

      // Don't process if already paid
      if (invoice.status === "paid") {
        return NextResponse.json({ received: true });
      }

      const amountPaid = (session.amount_total || 0) / 100;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      const now = new Date().toISOString();

      // Record payment in invoice_payments table
      const { data: payment } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: invoiceId,
          amount: amountPaid,
          payment_method: "stripe",
          reference: paymentIntentId || session.id,
          notes: `Stripe payment via checkout session ${session.id}`,
          paid_at: now,
        })
        .select()
        .single();

      // Calculate new totals
      const previouslyPaid = Number(invoice.amount_paid || 0);
      const totalPaid = previouslyPaid + amountPaid;
      const totalDue = Number(invoice.total);
      const newAmountDue = Math.max(0, Math.round((totalDue - totalPaid) * 100) / 100);
      const isPaidInFull = newAmountDue <= 0.01; // account for rounding

      // Update invoice
      const { data: updatedInvoice } = await supabase
        .from("invoices")
        .update({
          amount_paid: Math.round(totalPaid * 100) / 100,
          amount_due: newAmountDue,
          status: isPaidInFull ? "paid" : "partially_paid",
          payment_status: isPaidInFull ? "paid" : "partially_paid",
          paid_at: isPaidInFull ? now : invoice.paid_at,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", invoiceId)
        .select()
        .single();

      // ─── On full payment: auto-confirm linked orders ───
      if (isPaidInFull) {
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
              description: `Status changed to Confirmed — invoice ${invoice.invoice_number} paid via Stripe`,
              actor_name: "Stripe",
            });
          }
        }
      }

      // ─── Xero/Sage payment sync (on any payment, not just full) ───
      if (invoice.roaster_id && payment) {
        syncToXero(invoice.roaster_id, async () => {
          await pushPaymentToXero(
            invoice.roaster_id,
            { invoice_number: invoice.invoice_number },
            {
              amount: payment.amount,
              paid_at: payment.paid_at,
              reference: payment.reference,
            }
          );
        });

        syncToSage(invoice.roaster_id, async () => {
          await pushPaymentToSage(
            invoice.roaster_id,
            { invoice_number: invoice.invoice_number },
            {
              amount: payment.amount,
              paid_at: payment.paid_at,
              reference: payment.reference,
            }
          );
        });

        syncToQuickBooks(invoice.roaster_id, async () => {
          await pushPaymentToQuickBooks(
            invoice.roaster_id,
            { invoice_number: invoice.invoice_number },
            {
              amount: payment.amount,
              paid_at: payment.paid_at,
              reference: payment.reference,
            }
          );
        });
      }

      // ─── Dispatch invoice.paid webhook on full payment ───
      if (isPaidInFull && updatedInvoice?.roaster_id) {
        dispatchWebhook(updatedInvoice.roaster_id, "invoice.paid", {
          invoice: {
            id: updatedInvoice.id,
            invoice_number: updatedInvoice.invoice_number,
            roaster_id: updatedInvoice.roaster_id,
            customer_id: updatedInvoice.customer_id,
            business_id: updatedInvoice.business_id,
            subtotal: updatedInvoice.subtotal,
            tax_rate: updatedInvoice.tax_rate,
            tax_amount: updatedInvoice.tax_amount,
            total: updatedInvoice.total,
            amount_paid: updatedInvoice.amount_paid,
            amount_due: updatedInvoice.amount_due,
            currency: updatedInvoice.currency,
            payment_method: updatedInvoice.payment_method,
            status: updatedInvoice.status,
            payment_status: updatedInvoice.payment_status,
            paid_at: updatedInvoice.paid_at,
            order_ids: updatedInvoice.order_ids,
          },
          payment: payment
            ? {
                id: payment.id,
                amount: payment.amount,
                payment_method: payment.payment_method,
                reference: payment.reference,
                paid_at: payment.paid_at,
              }
            : null,
        });
      }

      // ─── Send payment confirmation email if paid in full ───
      if (isPaidInFull) {
        try {
          let customerEmail: string | null = null;
          let customerName = "Customer";

          // 1. Try people table
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

          // 2. Fallback to businesses table
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

          // 3. Fallback to linked order customer_email
          const orderIds = Array.isArray(invoice.order_ids) ? invoice.order_ids as string[] : [];
          if (!customerEmail && orderIds.length > 0) {
            const { data: linkedOrder } = await supabase
              .from("orders")
              .select("customer_email, customer_name")
              .eq("id", orderIds[0])
              .single();
            if (linkedOrder) {
              customerEmail = linkedOrder.customer_email || null;
              if (customerName === "Customer" && linkedOrder.customer_name) {
                customerName = linkedOrder.customer_name;
              }
            }
          }

          if (customerEmail) {
            let ownerName = "Roastery Platform";
            let ownerEmail = "";
            let vatNumber: string | null = null;
            let bankName: string | null = null;
            let bankAccountNumber: string | null = null;
            let bankSortCode: string | null = null;
            let paymentInstructions: string | null = null;
            let branding: EmailBranding = {};

            if (invoice.owner_type === "roaster" && invoice.roaster_id) {
              const { data: roaster } = await supabase
                .from("roasters")
                .select("business_name, email, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions")
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
                  logoSize: roaster.storefront_logo_size || "medium",
                  buttonColour: roaster.storefront_button_colour || undefined,
                  buttonTextColour: roaster.storefront_button_text_colour || undefined,
                  buttonStyle: (roaster.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
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
              .eq("invoice_id", invoiceId)
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
              amountPaid: Math.round(totalPaid * 100) / 100,
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

            await sendInvoicePaymentConfirmationEmail({
              to: customerEmail,
              customerName,
              ownerName,
              invoiceNumber: invoice.invoice_number,
              total: Number(invoice.total),
              amountPaid: Math.round(totalPaid * 100) / 100,
              currency: invoice.currency || "GBP",
              branding,
              attachments: pdfAttachment ? [pdfAttachment] : undefined,
            });
          }
        } catch (emailErr) {
          console.error("Failed to send payment confirmation email:", emailErr);
        }
      }
    } catch (processErr) {
      console.error("Error processing invoice payment webhook:", processErr);
    }
  }

  return NextResponse.json({ received: true });
}
