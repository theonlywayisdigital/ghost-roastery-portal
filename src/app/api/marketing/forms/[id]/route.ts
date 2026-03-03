import { NextRequest, NextResponse } from "next/server";
import { getMarketingOwner, applyOwnerFilter } from "@/lib/marketing-auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: form, error } = await applyOwnerFilter(
    supabase.from("forms").select("*").eq("id", id),
    owner
  ).single();

  if (error || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ form });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    const allowedFields: Record<string, unknown> = {};
    const editableKeys = ["name", "description", "form_type", "fields", "settings", "branding", "status"];

    for (const key of editableKeys) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    const { data: form, error } = await applyOwnerFilter(
      supabase.from("forms").update(allowedFields).eq("id", id),
      owner
    )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Update form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await getMarketingOwner(request);
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { error } = await applyOwnerFilter(
    supabase.from("forms").delete().eq("id", id),
    owner
  );

  if (error) {
    return NextResponse.json({ error: "Failed to delete form" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
