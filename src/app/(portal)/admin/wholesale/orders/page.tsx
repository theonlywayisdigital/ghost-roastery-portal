import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminWholesaleOrders } from "./AdminWholesaleOrders";

export default async function AdminWholesaleOrdersPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/login");

  return <AdminWholesaleOrders />;
}
