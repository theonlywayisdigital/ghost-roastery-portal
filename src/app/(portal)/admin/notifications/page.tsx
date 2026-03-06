import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { Bell } from "@/components/icons";

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Notification Centre"
      description="Send notifications app-wide to roasters and/or customers. Manage system alerts, onboarding reminders, and platform announcements."
      icon={Bell}
    />
  );
}
