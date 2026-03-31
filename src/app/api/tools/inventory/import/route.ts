import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";
import {
  csvToNormalisedGreenBeans,
  csvToNormalisedRoastedStock,
  type GreenBeanField,
  type RoastedStockField,
  type InventoryImportResult,
} from "@/lib/inventory-import";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { csvText, mapping, type, greenBeanMappings } = body as {
    csvText: string;
    mapping: Record<string, string>;
    type: "green_beans" | "roasted_stock";
    greenBeanMappings?: Record<string, string>;
  };

  if (!csvText || !mapping || !type) {
    return NextResponse.json(
      { error: "csvText, mapping, and type are required" },
      { status: 400 }
    );
  }

  const roasterId = user.roaster.id;
  const supabase = createServerClient();

  if (type === "green_beans") {
    return handleGreenBeans(supabase, roasterId, csvText, mapping as Record<string, GreenBeanField>);
  } else if (type === "roasted_stock") {
    return handleRoastedStock(supabase, roasterId, csvText, mapping as Record<string, RoastedStockField>, greenBeanMappings);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// ─── Green Beans Import ─────────────────────────────────────

async function handleGreenBeans(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  csvText: string,
  mapping: Record<string, GreenBeanField>
) {
  const { beans, errors: parseErrors } = csvToNormalisedGreenBeans({ csvText, mapping });

  if (beans.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: 0,
      errors: parseErrors.length > 0 ? parseErrors : ["No green beans found in CSV"],
      total: 0,
    } satisfies InventoryImportResult);
  }

  // Check limit
  const limitCheck = await checkLimit(roasterId, "greenBeans", beans.length);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, upgrade_required: true },
      { status: 403 }
    );
  }

  // Build supplier name → id map
  const supplierNames = Array.from(
    new Set(beans.map((b) => b.supplier_name).filter((n): n is string => n != null))
  );
  const supplierMap = new Map<string, string>();

  if (supplierNames.length > 0) {
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("roaster_id", roasterId)
      .eq("is_active", true);

    if (suppliers) {
      for (const s of suppliers) {
        supplierMap.set(s.name.toLowerCase().trim(), s.id);
      }
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  for (const bean of beans) {
    try {
      // Resolve supplier
      let supplierId: string | null = null;
      if (bean.supplier_name) {
        supplierId = supplierMap.get(bean.supplier_name.toLowerCase().trim()) || null;
        if (!supplierId) {
          errors.push(`"${bean.name}": Supplier "${bean.supplier_name}" not found — imported without supplier`);
        }
      }

      const { data, error } = await supabase
        .from("green_beans")
        .insert({
          roaster_id: roasterId,
          name: bean.name,
          origin_country: bean.origin_country,
          origin_region: bean.origin_region,
          variety: bean.variety,
          process: bean.process,
          lot_number: bean.lot_number,
          supplier_id: supplierId,
          arrival_date: bean.arrival_date,
          cost_per_kg: bean.cost_per_kg,
          cupping_score: bean.cupping_score,
          tasting_notes: bean.tasting_notes,
          altitude_masl: bean.altitude_masl,
          harvest_year: bean.harvest_year,
          current_stock_kg: bean.current_stock_kg,
          low_stock_threshold_kg: bean.low_stock_threshold_kg,
          notes: bean.notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create initial movement if stock > 0
      if (bean.current_stock_kg > 0) {
        await supabase.from("green_bean_movements").insert({
          roaster_id: roasterId,
          green_bean_id: data.id,
          movement_type: "purchase",
          quantity_kg: bean.current_stock_kg,
          balance_after_kg: bean.current_stock_kg,
          unit_cost: bean.cost_per_kg,
          notes: "Imported via CSV",
        });
      }

      imported++;
    } catch (err) {
      console.error(`[inventory-import] Failed to import green bean "${bean.name}":`, err);
      errors.push(`${bean.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      skipped++;
    }
  }

  const result: InventoryImportResult = {
    imported,
    skipped,
    errors,
    total: beans.length,
  };

  return NextResponse.json(result);
}

// ─── Roasted Stock Import ───────────────────────────────────

async function handleRoastedStock(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string,
  csvText: string,
  mapping: Record<string, RoastedStockField>,
  greenBeanMappings?: Record<string, string>
) {
  const { stock, errors: parseErrors } = csvToNormalisedRoastedStock({ csvText, mapping });

  if (stock.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: 0,
      errors: parseErrors.length > 0 ? parseErrors : ["No roasted stock found in CSV"],
      total: 0,
    } satisfies InventoryImportResult);
  }

  // Check limit
  const limitCheck = await checkLimit(roasterId, "roastedStock", stock.length);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.message, upgrade_required: true },
      { status: 403 }
    );
  }

  // If client sent explicit green bean mappings (from the link step), use those.
  // Otherwise fall back to server-side name lookup.
  const hasClientMappings = greenBeanMappings && Object.keys(greenBeanMappings).length > 0;

  let beanMap: Map<string, string> | null = null;
  if (!hasClientMappings) {
    const beanNames = Array.from(
      new Set(stock.map((s) => s.green_bean_name).filter((n): n is string => n != null))
    );
    if (beanNames.length > 0) {
      beanMap = new Map<string, string>();
      const { data: greenBeans } = await supabase
        .from("green_beans")
        .select("id, name")
        .eq("roaster_id", roasterId)
        .eq("is_active", true);

      if (greenBeans) {
        for (const gb of greenBeans) {
          beanMap.set(gb.name.toLowerCase().trim(), gb.id);
        }
      }
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors = [...parseErrors];

  for (let i = 0; i < stock.length; i++) {
    const item = stock[i];
    try {
      // Resolve green bean — prefer client mapping, fall back to name lookup
      let greenBeanId: string | null = null;
      if (hasClientMappings) {
        greenBeanId = greenBeanMappings[String(i)] || null;
      } else if (item.green_bean_name && beanMap) {
        greenBeanId = beanMap.get(item.green_bean_name.toLowerCase().trim()) || null;
        if (!greenBeanId) {
          errors.push(`"${item.name}": Source bean "${item.green_bean_name}" not found — imported without link`);
        }
      }

      const { data, error } = await supabase
        .from("roasted_stock")
        .insert({
          roaster_id: roasterId,
          name: item.name,
          green_bean_id: greenBeanId,
          current_stock_kg: item.current_stock_kg,
          low_stock_threshold_kg: item.low_stock_threshold_kg,
          batch_size_kg: item.batch_size_kg,
          notes: item.notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create initial movement if stock > 0
      if (item.current_stock_kg > 0) {
        await supabase.from("roasted_stock_movements").insert({
          roaster_id: roasterId,
          roasted_stock_id: data.id,
          movement_type: "roast_addition",
          quantity_kg: item.current_stock_kg,
          balance_after_kg: item.current_stock_kg,
          notes: "Imported via CSV",
        });
      }

      imported++;
    } catch (err) {
      console.error(`[inventory-import] Failed to import roasted stock "${item.name}":`, err);
      errors.push(`${item.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      skipped++;
    }
  }

  const result: InventoryImportResult = {
    imported,
    skipped,
    errors,
    total: stock.length,
  };

  return NextResponse.json(result);
}
