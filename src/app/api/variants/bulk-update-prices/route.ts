import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { pushProductToChannels } from "@/lib/ecommerce-stock-sync";

interface VariantUpdate {
  variant_id: string;
  retail_price?: number | null;
  wholesale_price?: number | null;
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { updates } = body as { updates: VariantUpdate[] };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const variantIds = updates.map((u) => u.variant_id);

  // Verify all variants belong to this roaster
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .in("id", variantIds)
    .eq("roaster_id", roaster.id);

  const validIds = new Set((existingVariants || []).map((v) => v.id));
  const validUpdates = updates.filter((u) => validIds.has(u.variant_id));

  if (validUpdates.length === 0) {
    return NextResponse.json({ error: "No valid variants found" }, { status: 404 });
  }

  // Apply updates
  let successCount = 0;
  for (const update of validUpdates) {
    const updateData: Record<string, unknown> = {};
    if (update.retail_price !== undefined) {
      updateData.retail_price = update.retail_price;
    }
    if (update.wholesale_price !== undefined) {
      updateData.wholesale_price = update.wholesale_price;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("product_variants")
        .update(updateData)
        .eq("id", update.variant_id)
        .eq("roaster_id", roaster.id);

      if (!error) successCount++;
    }
  }

  // Push affected products to ecommerce channels (fire-and-forget)
  const affectedProductIds = Array.from(
    new Set(
      (existingVariants || [])
        .filter((v) => validIds.has(v.id))
        .map((v) => v.product_id)
    )
  );

  for (const productId of affectedProductIds) {
    pushProductToChannels(roaster.id as string, productId).catch((err) =>
      console.error("[bulk-update-prices] Product push error:", err)
    );
  }

  return NextResponse.json({
    updated: successCount,
    total: validUpdates.length,
  });
}
