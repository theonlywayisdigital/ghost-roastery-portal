import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { IntegrationsPage } from "./IntegrationsPage";

export default async function IntegrationsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster?.id) redirect("/settings");

  return <IntegrationsPage />;
}
