import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    margin_markup_multiplier: roaster.margin_markup_multiplier ?? 3.5,
    margin_wholesale_discount_pct: roaster.margin_wholesale_discount_pct ?? 35,
    margin_retail_rounding: roaster.margin_retail_rounding ?? 0.05,
    margin_wholesale_rounding: roaster.margin_wholesale_rounding ?? 0.05,
    default_weight_loss_pct: roaster.default_weight_loss_pct ?? 14,
    invoice_currency: roaster.invoice_currency || "GBP",
  });
}

export async function PUT(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const allowedFields = [
      "margin_markup_multiplier",
      "margin_wholesale_discount_pct",
      "margin_retail_rounding",
      "margin_wholesale_rounding",
      "default_weight_loss_pct",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("roasters")
      .update(updates)
      .eq("id", roaster.id);

    if (error) {
      console.error("Margin settings update error:", error);
      return NextResponse.json(
        { error: "Failed to update margin settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Margin settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
