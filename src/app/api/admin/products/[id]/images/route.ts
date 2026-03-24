import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: images, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }

  return NextResponse.json({ images: images || [] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, roaster_id")
    .eq("id", id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if ((count || 0) >= 10) {
    return NextResponse.json({ error: "Maximum 10 images per product" }, { status: 400 });
  }

  const body = await request.json();
  const { url, storage_path } = body;

  if (!url || !storage_path) {
    return NextResponse.json({ error: "url and storage_path are required" }, { status: 400 });
  }

  const nextOrder = count || 0;
  const isPrimary = nextOrder === 0;

  const { data: image, error } = await supabase
    .from("product_images")
    .insert({
      product_id: id,
      roaster_id: product.roaster_id,
      storage_path,
      url,
      sort_order: nextOrder,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to add image" }, { status: 500 });
  }

  if (isPrimary) {
    await supabase.from("products").update({ image_url: url }).eq("id", id);
  }

  return NextResponse.json({ image }, { status: 201 });
}
