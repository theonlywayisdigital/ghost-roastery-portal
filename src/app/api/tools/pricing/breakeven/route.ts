import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { checkFeature } from "@/lib/feature-gates";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("breakeven_calculations")
    .select("*")
    .eq("roaster_id", roaster.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch breakeven calculations" }, { status: 500 });
  return NextResponse.json({ calculations: data });
}

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const featureCheck = await checkFeature(roaster.id as string, "toolsBreakeven");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.message, upgrade_required: true }, { status: 403 });
  }

  const body = await request.json();
  const { name, fixed_costs_monthly, variable_cost_per_unit, selling_price_per_unit, breakeven_units, breakeven_revenue } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("breakeven_calculations")
    .insert({
      roaster_id: roaster.id,
      name,
      fixed_costs_monthly: parseFloat(fixed_costs_monthly) || 0,
      variable_cost_per_unit: parseFloat(variable_cost_per_unit) || 0,
      selling_price_per_unit: parseFloat(selling_price_per_unit) || 0,
      breakeven_units: parseInt(breakeven_units) || 0,
      breakeven_revenue: parseFloat(breakeven_revenue) || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save breakeven calculation" }, { status: 500 });
  return NextResponse.json({ calculation: data }, { status: 201 });
}
