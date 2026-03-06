import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { ScrollText } from "@/components/icons";

export default async function AdminAuditLogsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Audit Logs"
      description="Activity log: who changed what, when. Tracks all admin actions including &ldquo;view as roaster&rdquo; impersonation actions, role changes, order modifications, and system events."
      icon={ScrollText}
    />
  );
}
