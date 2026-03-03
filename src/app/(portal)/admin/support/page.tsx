import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSupportClient } from "./AdminSupportClient";

export default async function AdminSupportPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return <AdminSupportClient />;
}
