import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminFinanceClient } from "./AdminFinanceClient";

export default async function AdminFinancePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return <AdminFinanceClient />;
}
