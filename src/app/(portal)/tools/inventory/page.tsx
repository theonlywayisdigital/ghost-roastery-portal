import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InventoryOverview } from "./InventoryOverview";

export default async function InventoryOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <InventoryOverview roasterId={user.roaster.id} />;
}
