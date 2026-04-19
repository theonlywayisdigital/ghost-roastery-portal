import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roast_import_mappings")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }

  return NextResponse.json({ mappings: data || [] });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, header_fingerprint, mapping } = body as {
    name: string;
    header_fingerprint: string[];
    mapping: Record<string, string>;
  };

  if (!name?.trim() || !header_fingerprint || !mapping) {
    return NextResponse.json({ error: "name, header_fingerprint, and mapping are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("roast_import_mappings")
    .insert({
      roaster_id: roaster.id,
      name: name.trim(),
      header_fingerprint,
      mapping,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }

  return NextResponse.json({ mapping: data });
}

export async function DELETE(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("roast_import_mappings")
    .delete()
    .eq("id", id)
    .eq("roaster_id", roaster.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
