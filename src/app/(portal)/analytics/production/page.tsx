import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProductionClient } from "./ProductionClient";

export default async function ProductionPage() {
  const user = await getCurrentUser();
  if (!user?.roaster) redirect("/login");
  return <ProductionClient />;
}
