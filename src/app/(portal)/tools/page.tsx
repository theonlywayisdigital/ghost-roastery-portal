import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ToolsHub } from "./ToolsHub";

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const roasterId = user.roaster.id as string;
  const supabase = createServerClient();

  // Fetch summary counts in parallel
  const [
    { count: greenBeanCount },
    { count: roastLogCount },
    { count: cuppingCount },
    { count: certCount },
    { data: lowStockBeans },
    { data: expiringCerts },
  ] = await Promise.all([
    supabase.from("green_beans").select("*", { count: "exact", head: true }).eq("roaster_id", roasterId),
    supabase.from("roast_logs").select("*", { count: "exact", head: true }).eq("roaster_id", roasterId),
    supabase.from("cupping_sessions").select("*", { count: "exact", head: true }).eq("roaster_id", roasterId),
    supabase.from("certifications").select("*", { count: "exact", head: true }).eq("roaster_id", roasterId),
    supabase.from("green_beans")
      .select("id, name, current_stock_kg, low_stock_threshold_kg")
      .eq("roaster_id", roasterId)
      .eq("is_active", true)
      .not("low_stock_threshold_kg", "is", null)
      .limit(10),
    supabase.from("certifications")
      .select("id, cert_name, expiry_date, status")
      .eq("roaster_id", roasterId)
      .in("status", ["expiring_soon", "expired"])
      .limit(10),
  ]);

  const lowStockItems = (lowStockBeans || []).filter(
    (b) => b.low_stock_threshold_kg && b.current_stock_kg <= b.low_stock_threshold_kg
  );

  return (
    <ToolsHub
      counts={{
        greenBeans: greenBeanCount || 0,
        roastLogs: roastLogCount || 0,
        cuppingSessions: cuppingCount || 0,
        certifications: certCount || 0,
      }}
      lowStockItems={lowStockItems}
      expiringCerts={expiringCerts || []}
    />
  );
}
