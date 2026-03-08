import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminWholesaleAccounts } from "./AdminWholesaleAccounts";

export default async function AdminWholesalePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  return <AdminWholesaleAccounts />;
}
