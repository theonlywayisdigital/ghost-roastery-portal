import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WebhooksPage } from "./WebhooksPage";

export default async function WebhooksRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster?.id) redirect("/settings");

  return <WebhooksPage />;
}
