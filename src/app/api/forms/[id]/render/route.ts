import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id, name, description, form_type, fields, settings, branding, roaster_id, roasters(business_name)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!form) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  return NextResponse.json({ form });
}
