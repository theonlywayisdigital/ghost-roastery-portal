import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import {
  type ImportResult,
  createNewProduct,
  loadGrindTypeMap,
} from "@/lib/product-import";
import { csvToNormalisedProducts, type CsvImportInput } from "@/lib/csv-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    csvText,
    mapping,
    defaultCategory,
    defaultIsRetail,
    defaultIsWholesale,
  } = body as CsvImportInput;

  if (!csvText || !mapping) {
    return NextResponse.json(
      { error: "csvText and mapping are required" },
      { status: 400 }
    );
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  // Parse CSV into normalised products
  const { products, errors: parseErrors } = csvToNormalisedProducts({
    csvText,
    mapping,
    defaultCategory,
    defaultIsRetail,
    defaultIsWholesale,
  });

  if (products.length === 0) {
    return NextResponse.json(
      {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: parseErrors.length > 0 ? parseErrors : ["No products found in CSV"],
        total: 0,
      },
      { status: 200 }
    );
  }

  // Check product limit
  const limitCheck = await checkLimit(roasterId, "products", products.length);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, upgrade_required: true },
      { status: 403 }
    );
  }

  // Load grind types
  const grindTypeMap = await loadGrindTypeMap(supabase, roasterId);

  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  for (const product of products) {
    try {
      await createNewProduct(supabase, product, roasterId, grindTypeMap);
      imported++;
    } catch (err) {
      console.error(`[csv-import] Failed to import "${product.name}":`, err);
      errors.push(
        `${product.name}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      skipped++;
    }
  }

  const result: ImportResult = {
    imported,
    updated: 0,
    skipped,
    errors,
    total: products.length,
  };

  return NextResponse.json(result);
}
