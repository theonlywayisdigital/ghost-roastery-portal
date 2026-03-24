import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, imageId } = await params;
  const supabase = createServerClient();

  // Fetch the image to get storage_path and is_primary
  const { data: image } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary, sort_order")
    .eq("id", imageId)
    .eq("product_id", id)
    .eq("roaster_id", roaster.id)
    .single();

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Delete from storage
  if (image.storage_path) {
    await supabase.storage.from("product-images").remove([image.storage_path]);
  }

  // Delete from database
  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    console.error("Product image delete error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }

  // If we deleted the primary image, promote the next image
  if (image.is_primary) {
    const { data: nextImage } = await supabase
      .from("product_images")
      .select("id, url")
      .eq("product_id", id)
      .eq("roaster_id", roaster.id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextImage) {
      await supabase
        .from("product_images")
        .update({ is_primary: true, sort_order: 0 })
        .eq("id", nextImage.id);

      // Update products.image_url for backward compat
      await supabase
        .from("products")
        .update({ image_url: nextImage.url })
        .eq("id", id);
    } else {
      // No images left, clear image_url
      await supabase
        .from("products")
        .update({ image_url: null })
        .eq("id", id);
    }
  }

  // Re-number sort orders
  const { data: remaining } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", id)
    .eq("roaster_id", roaster.id)
    .order("sort_order", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("product_images")
        .update({ sort_order: i })
        .eq("id", remaining[i].id);
    }
  }

  return NextResponse.json({ success: true });
}
