import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { imageIds } = body as { imageIds: string[] };

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json({ error: "imageIds array is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify all images belong to this product + roaster
  const { data: existing } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", id)
    .eq("roaster_id", roaster.id);

  const existingIds = new Set((existing || []).map((i) => i.id));
  for (const imgId of imageIds) {
    if (!existingIds.has(imgId)) {
      return NextResponse.json({ error: "Invalid image ID in list" }, { status: 400 });
    }
  }

  // Update sort_order and is_primary based on new order
  for (let i = 0; i < imageIds.length; i++) {
    await supabase
      .from("product_images")
      .update({ sort_order: i, is_primary: i === 0 })
      .eq("id", imageIds[i]);
  }

  // Update products.image_url to the new primary image
  const { data: primary } = await supabase
    .from("product_images")
    .select("url")
    .eq("id", imageIds[0])
    .single();

  if (primary) {
    await supabase
      .from("products")
      .update({ image_url: primary.url })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
