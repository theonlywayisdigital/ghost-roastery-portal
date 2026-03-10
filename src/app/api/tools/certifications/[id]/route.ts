import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

function computeStatus(expiry_date: string | null, reminder_days: number): string {
  if (!expiry_date) return "pending";

  const now = new Date();
  const expiry = new Date(expiry_date);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= reminder_days) return "expiring_soon";
  return "active";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Certification not found" }, { status: 404 });
  return NextResponse.json({ certification: data });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const {
    cert_name,
    cert_type,
    certificate_number,
    issuing_body,
    issue_date,
    expiry_date,
    reminder_days = 30,
    document_url,
    document_name,
    notes,
  } = body;

  if (!cert_name) return NextResponse.json({ error: "Certificate name is required" }, { status: 400 });

  const status = computeStatus(expiry_date || null, parseInt(reminder_days) || 30);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("certifications")
    .update({
      cert_name,
      cert_type: cert_type || null,
      certificate_number: certificate_number || null,
      issuing_body: issuing_body || null,
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      status,
      reminder_days: parseInt(reminder_days) || 30,
      document_url: document_url || null,
      document_name: document_name || null,
      notes: notes || null,
    })
    .eq("id", id)
    .eq("roaster_id", roaster.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update certification" }, { status: 500 });
  return NextResponse.json({ certification: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) return NextResponse.json({ error: "Failed to delete certification" }, { status: 500 });
  return NextResponse.json({ success: true });
}
