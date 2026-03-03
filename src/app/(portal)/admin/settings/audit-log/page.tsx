import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { ScrollText } from "lucide-react";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Audit Log"
      description="View a chronological log of admin actions, role changes, order modifications, and system events."
      icon={ScrollText}
    />
  );
}
