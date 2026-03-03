import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { Coffee } from "lucide-react";

export default async function AdminPartnersPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Partner Program"
      description="Review roaster applications, manage the Ghost Roaster programme, approve new partners, and track onboarding progress."
      icon={Coffee}
    />
  );
}
