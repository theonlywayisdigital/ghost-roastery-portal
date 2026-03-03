import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { generateInvoiceHtml } from "@/lib/invoice-pdf";

export async function GET(
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

    // Resolve customer name
    let customerName = "Customer";
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

    if (customerName === "Customer" && invoice.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", invoice.business_id)
        .single();

      if (business?.name) {
        customerName = business.name;
      }
    }

    // Resolve owner info and branding
    let ownerName = "Ghost Roastery";
    let ownerAddress = "";
    let ownerEmail = "";
    let branding: {
      logoUrl?: string | null;
      primaryColour?: string;
      accentColour?: string;
      headingFont?: string;
      bodyFont?: string;
    } = {};

    if (invoice.owner_type === "roaster" && invoice.roaster_id) {
      const { data: roaster } = await supabase
        .from("partner_roasters")
        .select("business_name, email, brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font")
        .eq("id", invoice.roaster_id)
        .single();

      if (roaster) {
        ownerName = roaster.business_name || ownerName;
        ownerEmail = roaster.email || "";
        branding = {
          logoUrl: roaster.brand_logo_url,
          primaryColour: roaster.brand_primary_colour || undefined,
          accentColour: roaster.brand_accent_colour || undefined,
          headingFont: roaster.brand_heading_font || undefined,
          bodyFont: roaster.brand_body_font || undefined,
        };
      }
    } else {
      // Ghost Roastery platform — get details from platform_settings
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .single();

      if (settings) {
        ownerEmail = "";
        branding = {
          logoUrl: settings.brand_logo_url,
          primaryColour: settings.brand_primary_colour || undefined,
          accentColour: settings.brand_accent_colour || undefined,
          headingFont: settings.brand_heading_font || undefined,
          bodyFont: settings.brand_body_font || undefined,
        };
        // Build address from bank details as a fallback display
        const addressParts: string[] = [];
        if (settings.bank_name) addressParts.push(`Bank: ${settings.bank_name}`);
        if (settings.bank_sort_code)
          addressParts.push(`Sort Code: ${settings.bank_sort_code}`);
        if (settings.bank_account_number)
          addressParts.push(`Account: ${settings.bank_account_number}`);
        if (settings.bank_iban) addressParts.push(`IBAN: ${settings.bank_iban}`);
        if (addressParts.length > 0) {
          ownerAddress = addressParts.join("\n");
        }
      }
    }

    // Generate HTML
    const html = generateInvoiceHtml({
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
      total: Number(invoice.total),
      amountPaid: Number(invoice.amount_paid || 0),
      notes: invoice.notes || null,
      status: invoice.status,
      currency: invoice.currency || "GBP",
      branding,
    });

    // Sanitise invoice number for filename (remove special chars)
    const safeFilename = invoice.invoice_number
      .replace(/[^a-zA-Z0-9\-_]/g, "_");

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFilename}.html"`,
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
