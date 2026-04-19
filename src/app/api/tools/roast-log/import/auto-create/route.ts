import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkLimit } from "@/lib/feature-gates";

interface AutoCreatePlan {
  profileName: string;
  greenBeanName: string | null; // null = manual selection already done
  existingGreenBeanId: string | null; // pre-matched green bean
  existingRoastedStockId: string | null; // for skip case (already matched)
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plans } = body as { plans: AutoCreatePlan[] };

  if (!plans || !Array.isArray(plans) || plans.length === 0) {
    return NextResponse.json({ error: "No auto-create plans provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const roasterId = roaster.id as string;

  // Count how many new roasted stock + green beans we need to create
  const newProfileCount = plans.filter((p) => !p.existingRoastedStockId).length;
  const uniqueGreenBeanNames = Array.from(
    new Set(
      plans
        .filter((p) => p.greenBeanName && !p.existingGreenBeanId)
        .map((p) => p.greenBeanName!.toLowerCase().trim())
    )
  );
  const newGreenBeanCount = uniqueGreenBeanNames.length;

  // Feature gate checks
  if (newProfileCount > 0) {
    const rsLimit = await checkLimit(roasterId, "roastedStock", newProfileCount);
    if (!rsLimit.allowed) {
      return NextResponse.json(
        { error: rsLimit.message, upgrade_required: true },
        { status: 403 }
      );
    }
  }

  if (newGreenBeanCount > 0) {
    const gbLimit = await checkLimit(roasterId, "greenBeans", newGreenBeanCount);
    if (!gbLimit.allowed) {
      return NextResponse.json(
        { error: gbLimit.message, upgrade_required: true },
        { status: 403 }
      );
    }
  }

  // Step 1: Create green beans (deduplicated by name)
  const greenBeanMap = new Map<string, string>(); // lowercase name → id

  for (const name of uniqueGreenBeanNames) {
    const originalName = plans.find(
      (p) => p.greenBeanName?.toLowerCase().trim() === name
    )?.greenBeanName;

    const { data: bean, error } = await supabase
      .from("green_beans")
      .insert({
        roaster_id: roasterId,
        name: originalName || name,
        current_stock_kg: 0,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !bean) {
      return NextResponse.json(
        { error: `Failed to create green bean "${originalName}": ${error?.message || "unknown"}` },
        { status: 500 }
      );
    }

    greenBeanMap.set(name, bean.id);
  }

  // Step 2: Create roasted stock profiles, linked to green beans
  const results: Record<string, { roasted_stock_id: string; green_bean_id: string | null }> = {};

  for (const plan of plans) {
    // If already has a roasted stock ID, just pass through
    if (plan.existingRoastedStockId) {
      results[plan.profileName] = {
        roasted_stock_id: plan.existingRoastedStockId,
        green_bean_id: plan.existingGreenBeanId,
      };
      continue;
    }

    // Resolve green bean ID
    let greenBeanId: string | null = plan.existingGreenBeanId;
    if (!greenBeanId && plan.greenBeanName) {
      greenBeanId = greenBeanMap.get(plan.greenBeanName.toLowerCase().trim()) || null;
    }

    const { data: stock, error } = await supabase
      .from("roasted_stock")
      .insert({
        roaster_id: roasterId,
        name: plan.profileName,
        green_bean_id: greenBeanId,
        current_stock_kg: 0,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !stock) {
      return NextResponse.json(
        { error: `Failed to create roasted stock "${plan.profileName}": ${error?.message || "unknown"}` },
        { status: 500 }
      );
    }

    results[plan.profileName] = {
      roasted_stock_id: stock.id,
      green_bean_id: greenBeanId,
    };
  }

  return NextResponse.json({
    created: results,
    greenBeansCreated: newGreenBeanCount,
    profilesCreated: newProfileCount,
  });
}
