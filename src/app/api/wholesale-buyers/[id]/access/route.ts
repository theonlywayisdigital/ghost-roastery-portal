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
