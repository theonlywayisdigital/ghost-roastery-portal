import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    business_name: roaster.business_name,
    address_line1: roaster.address_line1 || "",
    address_line2: roaster.address_line2 || "",
    city: roaster.city || "",
    postcode: roaster.postcode || "",
    country: roaster.country || "GB",
    vat_number: roaster.vat_number || "",
    billing_email: roaster.billing_email || roaster.email || "",
    platform_fee_percent: roaster.platform_fee_percent ?? 4.0,
    // Customer billing fields
    invoice_prefix: roaster.invoice_prefix || "INV",
    default_payment_terms: roaster.default_payment_terms ?? 30,
    invoice_currency: roaster.invoice_currency || "GBP",
    bank_name: roaster.bank_name || "",
    bank_account_number: roaster.bank_account_number || "",
    bank_sort_code: roaster.bank_sort_code || "",
    payment_instructions: roaster.payment_instructions || "",
    late_payment_terms: roaster.late_payment_terms || "",
    auto_send_invoices: roaster.auto_send_invoices ?? false,
    invoice_reminder_enabled: roaster.invoice_reminder_enabled ?? false,
    reminder_days_before_due: roaster.reminder_days_before_due ?? 7,
  });
}

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      vat_number,
      billing_email,
      invoice_prefix,
      default_payment_terms,
      invoice_currency,
      bank_name,
      bank_account_number,
      bank_sort_code,
      payment_instructions,
      late_payment_terms,
      auto_send_invoices,
      invoice_reminder_enabled,
      reminder_days_before_due,
    } = body;

    // Build update object — only include fields that were sent
    const updates: Record<string, unknown> = {};
    if ("vat_number" in body) updates.vat_number = vat_number || null;
    if ("billing_email" in body) updates.billing_email = billing_email || null;
    if ("invoice_prefix" in body) updates.invoice_prefix = invoice_prefix || "INV";
    if ("default_payment_terms" in body) updates.default_payment_terms = default_payment_terms ?? 30;
    if ("invoice_currency" in body) updates.invoice_currency = invoice_currency || "GBP";
    if ("bank_name" in body) updates.bank_name = bank_name || null;
    if ("bank_account_number" in body) updates.bank_account_number = bank_account_number || null;
    if ("bank_sort_code" in body) updates.bank_sort_code = bank_sort_code || null;
    if ("payment_instructions" in body) updates.payment_instructions = payment_instructions || null;
    if ("late_payment_terms" in body) updates.late_payment_terms = late_payment_terms || null;
    if ("auto_send_invoices" in body) updates.auto_send_invoices = auto_send_invoices ?? false;
    if ("invoice_reminder_enabled" in body) updates.invoice_reminder_enabled = invoice_reminder_enabled ?? false;
    if ("reminder_days_before_due" in body) updates.reminder_days_before_due = reminder_days_before_due ?? 7;

    const supabase = createServerClient();
    const { error } = await supabase
      .from("partner_roasters")
      .update(updates)
      .eq("id", roaster.id);

    if (error) {
      console.error("Billing settings update error:", error);
      return NextResponse.json(
        { error: "Failed to update billing settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Billing settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
