import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { generateInvoiceHtml, generateInvoicePdf } from "@/lib/invoice-pdf";
import type { EmailBranding } from "@/lib/email-template";

export async function GET(
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
  const format = request.nextUrl.searchParams.get("format") || "pdf";
  const supabase = createServerClient();

  try {
    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Access control: roaster can only view their own invoices
    if (
      isRoaster &&
      !isAdmin &&
      invoice.roaster_id !== user.roaster?.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true });

    // Resolve customer name + address
    let customerName = "Customer";
    let customerAddress = "";

    if (invoice.customer_id) {
      const { data: person } = await supabase
        .from("people")
        .select("first_name, last_name")
        .eq("id", invoice.customer_id)
        .single();

      if (person) {
        customerName = `${person.first_name} ${person.last_name}`.trim();
      }
    }

    if (invoice.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name, address_line_1, address_line_2, city, county, postcode, country")
        .eq("id", invoice.business_id)
        .single();

      if (business) {
        if (customerName === "Customer" && business.name) {
          customerName = business.name;
        }
        const addrParts = [
          business.address_line_1,
          business.address_line_2,
          business.city,
          business.county,
          business.postcode,
          business.country,
        ].filter(Boolean);
        if (addrParts.length > 0) {
          customerAddress = addrParts.join(", ");
        }
      }
    }

    // Resolve owner info, branding, and bank details
    let ownerName = "Roastery Platform";
    let ownerAddress = "";
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
        };
      }
    } else {
      // Roastery Platform platform — get details from platform_settings
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .single();

      if (settings) {
        ownerEmail = "";
        bankName = settings.bank_name || null;
        bankAccountNumber = settings.bank_account_number || null;
        bankSortCode = settings.bank_sort_code || null;
        paymentInstructions = settings.payment_instructions || null;
        branding = {
          logoUrl: settings.brand_logo_url,
          primaryColour: settings.brand_primary_colour || undefined,
          accentColour: settings.brand_accent_colour || undefined,
          headingFont: settings.brand_heading_font || undefined,
          bodyFont: settings.brand_body_font || undefined,
        };
      }
    }

    // Shared params
    const sharedParams = {
      ownerName,
      ownerAddress,
      ownerEmail,
      customerName,
      invoiceNumber: invoice.invoice_number,
      issuedDate: invoice.issued_date || invoice.created_at,
      dueDate: invoice.payment_due_date || null,
      lineItems: (lineItems || []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      })),
      subtotal: Number(invoice.subtotal),
      taxRate: Number(invoice.tax_rate || 0),
      taxAmount: Number(invoice.tax_amount || 0),
      discountAmount: Number(invoice.discount_amount || 0),
      shippingAmount: Number(invoice.shipping_amount || 0),
      total: Number(invoice.total),
      amountPaid: Number(invoice.amount_paid || 0),
      notes: invoice.notes || null,
      status: invoice.status,
      currency: invoice.currency || "GBP",
      branding,
    };

    const safeFilename = invoice.invoice_number
      .replace(/[^a-zA-Z0-9\-_]/g, "_");

    // HTML format — for web preview / print
    if (format === "html") {
      const html = generateInvoiceHtml(sharedParams);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${safeFilename}.html"`,
        },
      });
    }

    // PDF format — real PDF via @react-pdf/renderer
    const pdfBuffer = await generateInvoicePdf({
      ...sharedParams,
      vatNumber,
      customerAddress: customerAddress || null,
      bankName,
      bankAccountNumber,
      bankSortCode,
      paymentInstructions,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice PDF error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
