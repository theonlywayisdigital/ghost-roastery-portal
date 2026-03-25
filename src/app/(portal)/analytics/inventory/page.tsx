import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user?.roaster) redirect("/login");
  return <InventoryClient />;
}
