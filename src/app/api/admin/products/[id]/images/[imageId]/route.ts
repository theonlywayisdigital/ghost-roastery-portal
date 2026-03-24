import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, imageId } = await params;
  const supabase = createServerClient();

  const { data: image } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("product_id", id)
    .single();

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (image.storage_path) {
    await supabase.storage.from("product-images").remove([image.storage_path]);
  }

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }

  if (image.is_primary) {
    const { data: nextImage } = await supabase
      .from("product_images")
      .select("id, url")
      .eq("product_id", id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextImage) {
      await supabase.from("product_images").update({ is_primary: true, sort_order: 0 }).eq("id", nextImage.id);
      await supabase.from("products").update({ image_url: nextImage.url }).eq("id", id);
    } else {
      await supabase.from("products").update({ image_url: null }).eq("id", id);
    }
  }

  // Re-number sort orders
  const { data: remaining } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase.from("product_images").update({ sort_order: i }).eq("id", remaining[i].id);
    }
  }

  return NextResponse.json({ success: true });
}
