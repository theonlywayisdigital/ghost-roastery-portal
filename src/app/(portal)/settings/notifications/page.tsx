import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotificationsPage } from "./NotificationsPage";

export default async function NotificationSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NotificationsPage />;
}
