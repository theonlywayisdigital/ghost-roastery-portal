import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { Sliders } from "@/components/icons";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Platform Settings"
      description="Global configuration: pricing tiers, commission rates, shipping SLAs, three-strikes thresholds, feature flags, and system-wide defaults."
      icon={Sliders}
    />
  );
}
