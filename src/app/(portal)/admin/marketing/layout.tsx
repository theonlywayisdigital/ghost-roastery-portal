import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminMarketingShell } from "./AdminMarketingShell";

export default async function AdminMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin") && !user?.roles.includes("super_admin")) redirect("/dashboard");

  return <AdminMarketingShell>{children}</AdminMarketingShell>;
}
