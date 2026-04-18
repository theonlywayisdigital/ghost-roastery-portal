import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — list all product_buyer_pricing rows for this buyer, with product and variant info
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("product_buyer_pricing")
    .select(
      `id, product_id, variant_id, custom_price,
       products!product_buyer_pricing_product_id_fkey(name),
       product_variants!product_buyer_pricing_variant_id_fkey(unit, wholesale_price, weight_grams)`
    )
    .eq("wholesale_access_id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Fetch buyer pricing error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const pricing = (rows || []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    variant_id: r.variant_id,
    custom_price: r.custom_price,
    product_name: (r.products as { name: string } | null)?.name || "Unknown",
    variant_label: (r.product_variants as { unit: string | null; wholesale_price: number | null; weight_grams: number | null } | null)?.unit || "—",
    standard_price: (r.product_variants as { unit: string | null; wholesale_price: number | null; weight_grams: number | null } | null)?.wholesale_price ?? null,
  }));

  return NextResponse.json({ pricing });
}

// POST — create a new product_buyer_pricing row
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { product_id, variant_id, custom_price } = body;

  if (!product_id || !variant_id || custom_price == null) {
    return NextResponse.json(
      { error: "product_id, variant_id, and custom_price are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Check for existing override for this variant+buyer combo
  const { data: existing } = await supabase
    .from("product_buyer_pricing")
    .select("id")
    .eq("variant_id", variant_id)
    .eq("wholesale_access_id", id)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("product_buyer_pricing")
      .update({ custom_price: parseFloat(custom_price) })
      .eq("id", existing.id);

    if (error) {
      console.error("Update buyer pricing error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: true });
  }

  const { error } = await supabase
    .from("product_buyer_pricing")
    .insert({
      product_id,
      variant_id,
      wholesale_access_id: id,
      roaster_id: user.roaster.id,
      custom_price: parseFloat(custom_price),
    });

  if (error) {
    console.error("Insert buyer pricing error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH — update a single product_buyer_pricing row
export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { pricingId, custom_price } = body;

  if (!pricingId || custom_price == null) {
    return NextResponse.json(
      { error: "pricingId and custom_price are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_buyer_pricing")
    .update({ custom_price: parseFloat(custom_price) })
    .eq("id", pricingId)
    .eq("wholesale_access_id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Update buyer pricing error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a single product_buyer_pricing row
export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || !user.roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const pricingId = searchParams.get("pricingId");

  if (!pricingId) {
    return NextResponse.json({ error: "pricingId is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("product_buyer_pricing")
    .delete()
    .eq("id", pricingId)
    .eq("wholesale_access_id", id)
    .eq("roaster_id", user.roaster.id);

  if (error) {
    console.error("Delete buyer pricing error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
