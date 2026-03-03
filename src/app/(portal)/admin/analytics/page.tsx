import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { BarChart3 } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Revenue & Analytics"
      description="Platform-wide GMV, platform fees, growth metrics, roaster performance, and order trends."
      icon={BarChart3}
    />
  );
}
