import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoiceAttachment } from "@/lib/invoice-pdf";
import { stripe } from "@/lib/stripe";

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

    // Access control: roaster can only send their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow sending draft invoices
    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft invoices can be sent" },
        { status: 400 }
      );
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true });

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
    let ownerName = "Ghost Roastery";
    let ownerEmail = "";
    let vatNumber: string | null = null;
    let bankName: string | null = null;
    let bankAccountNumber: string | null = null;
    let bankSortCode: string | null = null;
    let paymentInstructions: string | null = null;
    let branding: { logoUrl?: string | null; primaryColour?: string; accentColour?: string; headingFont?: string; bodyFont?: string; businessName?: string } = {};

    let stripeAccountId: string | null = null;
    let platformFeePercent = 0;

    if (invoice.owner_type === "roaster" && invoice.roaster_id) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("business_name, email, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, vat_number, bank_name, bank_account_number, bank_sort_code, payment_instructions, stripe_account_id, platform_fee_percent")
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
        stripeAccountId = roaster.stripe_account_id || null;
        platformFeePercent = roaster.platform_fee_percent || 0;
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

    // Require a customer email before marking as sent
    if (!customerEmail) {
      return NextResponse.json(
        {
          error:
            "No customer email address found. Add a customer with an email before sending.",
        },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session if roaster has Stripe Connect
    let stripePaymentLinkUrl: string | null = null;
    let stripePaymentLinkId: string | null = null;

    if (stripeAccountId) {
      try {
        const amountDue = invoice.amount_due ?? invoice.total;
        const amountPence = Math.round(amountDue * 100);
        const platformFeePence = Math.round(amountPence * (platformFeePercent / 100));

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: customerEmail || undefined,
          line_items: [
            {
              price_data: {
                currency: (invoice.currency || "GBP").toLowerCase(),
                product_data: {
                  name: `Invoice ${invoice.invoice_number}`,
                  description: `Payment for invoice ${invoice.invoice_number} from ${ownerName}`,
                },
                unit_amount: amountPence,
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: platformFeePence > 0 ? platformFeePence : undefined,
            transfer_data: {
              destination: stripeAccountId,
            },
            metadata: {
              invoice_id: id,
              invoice_number: invoice.invoice_number,
              roaster_id: invoice.roaster_id || "",
            },
          },
          metadata: {
            invoice_id: id,
            invoice_number: invoice.invoice_number,
            type: "invoice_payment",
          },
          success_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${invoice.invoice_access_token}?paid=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${invoice.invoice_access_token}`,
        });

        stripePaymentLinkUrl = session.url;
        stripePaymentLinkId = session.id;
      } catch (stripeErr) {
        console.error("Failed to create Stripe checkout session for invoice:", stripeErr);
        // Don't block sending — fall back to bank transfer
      }
    }

    const now = new Date().toISOString();

    // Update status to sent (include Stripe link if created)
    const invoiceUpdates: Record<string, unknown> = {
      status: "sent",
      sent_at: now,
      issued_date: now.split("T")[0],
    };
    if (stripePaymentLinkUrl) {
      invoiceUpdates.stripe_payment_link_url = stripePaymentLinkUrl;
      invoiceUpdates.stripe_payment_link_id = stripePaymentLinkId;
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(invoiceUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error sending invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to send invoice" },
        { status: 500 }
      );
    }

    // Send email
    {
      try {
        const mappedLineItems = (lineItems || []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total: Number(item.total),
        }));

        // Generate PDF attachment
        const pdfAttachment = await generateInvoiceAttachment({
          ownerName,
          ownerAddress: "",
          ownerEmail,
          vatNumber,
          customerName,
          customerAddress: null,
          invoiceNumber: invoice.invoice_number,
          issuedDate: invoice.issued_date || now,
          dueDate: invoice.payment_due_date || null,
          lineItems: mappedLineItems,
          subtotal: Number(invoice.subtotal),
          taxRate: Number(invoice.tax_rate || 0),
          taxAmount: Number(invoice.tax_amount || 0),
          discountAmount: Number(invoice.discount_amount || 0),
          total: Number(invoice.total),
          amountPaid: Number(invoice.amount_paid || 0),
          notes: invoice.notes || null,
          status: "sent",
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

        await sendInvoiceEmail({
          to: customerEmail,
          customerName,
          ownerName,
          invoiceNumber: invoice.invoice_number,
          total: Number(invoice.total),
          currency: invoice.currency || "GBP",
          dueDate: invoice.payment_due_date || null,
          accessToken: invoice.invoice_access_token,
          stripePaymentLinkUrl: stripePaymentLinkUrl || invoice.stripe_payment_link_url || null,
          lineItems: mappedLineItems,
          branding,
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
        });
      } catch (emailError) {
        console.error("Error sending invoice email:", emailError);
        // Don't fail the request if email fails — invoice is already marked as sent
      }
    }

    // Generate public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${invoice.invoice_access_token}`;

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      public_url: publicUrl,
      email_sent: true,
    });
  } catch (error) {
    console.error("Send invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
