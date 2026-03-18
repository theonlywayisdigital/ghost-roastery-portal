import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { InventoryOverview } from "./InventoryOverview";

export default async function InventoryOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  const supabase = createServerClient();
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("default_batch_size_kg")
    .eq("id", user.roaster.id)
    .single();

  return (
    <InventoryOverview
      roasterId={user.roaster.id}
      defaultBatchSizeKg={roaster?.default_batch_size_kg ?? null}
    />
  );
}
