import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { getGRRoasterId } from "@/lib/gr-roaster";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roasterId = await getGRRoasterId();
  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("roaster_id", roasterId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin products fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roasterId = await getGRRoasterId();
    const body = await request.json();
    const {
      name, description, price, unit, image_url, is_active, sort_order,
      is_retail, is_wholesale, retail_price, wholesale_price,
      minimum_wholesale_quantity, sku, weight_grams,
      is_purchasable, track_stock, retail_stock_count,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        roaster_id: roasterId,
        name,
        description: description || null,
        price: price != null ? parseFloat(price) : 0,
        unit: unit || "250g",
        image_url: image_url || null,
        is_active: is_active ?? true,
        sort_order: sort_order ?? 0,
        is_retail: is_retail ?? true,
        is_wholesale: is_wholesale ?? false,
        retail_price: retail_price != null ? parseFloat(retail_price) : null,
        wholesale_price: wholesale_price != null ? parseFloat(wholesale_price) : null,
        minimum_wholesale_quantity: minimum_wholesale_quantity ?? 1,
        sku: sku || null,
        weight_grams: weight_grams != null ? parseInt(weight_grams) : null,
        is_purchasable: is_purchasable ?? true,
        track_stock: track_stock ?? false,
        retail_stock_count: retail_stock_count != null ? parseInt(retail_stock_count) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Admin product creation error:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Admin product creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
