import { redirect } from "next/navigation";

export default function WebhooksRoute() {
  redirect("/settings/integrations?tab=webhooks");
}
