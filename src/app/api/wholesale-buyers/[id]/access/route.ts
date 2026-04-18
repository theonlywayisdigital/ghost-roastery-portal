import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — list all product_buyer_access rows for this buyer, with product name
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("product_buyer_access")
    .select("id, product_id, products!product_buyer_access_product_id_fkey(name)")
    .eq("wholesale_access_id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Fetch buyer access error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const access = (rows || []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: (r.products as { name: string } | null)?.name || "Unknown",
  }));

  return NextResponse.json({ access });
}

// POST — add a product_buyer_access row
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { product_id } = body;

  if (!product_id) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check for existing
  const { data: existing } = await supabase
    .from("product_buyer_access")
    .select("id")
    .eq("product_id", product_id)
    .eq("wholesale_access_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Access already exists" }, { status: 409 });
  }

  const { error } = await supabase
    .from("product_buyer_access")
    .insert({
      product_id,
      wholesale_access_id: id,
      roaster_id: user.roaster.id,
    });

  if (error) {
    console.error("Insert buyer access error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a single product_buyer_access row
export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const accessId = searchParams.get("accessId");

  if (!accessId) {
    return NextResponse.json({ error: "accessId is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_buyer_access")
    .delete()
    .eq("id", accessId)
    .eq("wholesale_access_id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Delete buyer access error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
