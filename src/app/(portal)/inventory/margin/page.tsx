import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { MarginCalculatorPlayground } from "./MarginCalculatorPlayground";

export default async function MarginCalculatorPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  const supabase = createServerClient();

  // Fetch roast profiles with their linked green beans (for cost data)
  const [{ data: profiles }, { data: greenBeans }] = await Promise.all([
    supabase
      .from("roasted_stock")
      .select("id, name, weight_loss_percentage, green_bean_id, green_beans(id, name, cost_per_kg)")
      .eq("roaster_id", roaster.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("green_beans")
      .select("id, name, cost_per_kg")
      .eq("roaster_id", roaster.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const marginSettings = {
    markup_multiplier: roaster.margin_markup_multiplier ?? 3.5,
    wholesale_discount_pct: roaster.margin_wholesale_discount_pct ?? 35,
    retail_rounding: roaster.margin_retail_rounding ?? 0.05,
    wholesale_rounding: roaster.margin_wholesale_rounding ?? 0.05,
    default_weight_loss_pct: roaster.default_weight_loss_pct ?? 14,
  };

  const currency = roaster.invoice_currency || "GBP";

  return (
    <MarginCalculatorPlayground
      profiles={profiles || []}
      greenBeans={greenBeans || []}
      settings={marginSettings}
      currency={currency}
    />
  );
}
