import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProductMappingPage } from "./ProductMappingPage";

export default async function ProductMappingRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster?.id) redirect("/settings");

  return <ProductMappingPage />;
}
