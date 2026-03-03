import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("Failed to load platform settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  // Get the existing settings row ID
  const { data: existing } = await supabase
    .from("platform_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Settings not found." },
      { status: 404 }
    );
  }

  const allowedFields = [
    "invoice_prefix",
    "invoice_next_number",
    "default_payment_terms",
    "default_currency",
    "bank_name",
    "bank_account_number",
    "bank_sort_code",
    "bank_iban",
    "payment_instructions",
    "late_payment_terms",
    "invoice_notes_default",
    "auto_send_invoices",
    "auto_reminder",
    "reminder_days_before_due",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update platform settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
