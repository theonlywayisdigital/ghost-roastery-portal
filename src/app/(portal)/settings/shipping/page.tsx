import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ShippingPage } from "./ShippingPage";

export default async function ShippingSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <ShippingPage />;
}
