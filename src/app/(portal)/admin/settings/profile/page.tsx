import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ComingSoon } from "@/components/ComingSoon";
import { UserCircle } from "@/components/icons";

export default async function AdminProfilePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <ComingSoon
      title="Admin Profile"
      description="Manage your admin account details, name, email, and login credentials."
      icon={UserCircle}
    />
  );
}
