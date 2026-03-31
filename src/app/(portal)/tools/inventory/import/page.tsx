import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { InventoryImportWizard } from "./InventoryImportWizard";

export default async function InventoryImportPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  return <InventoryImportWizard />;
}
