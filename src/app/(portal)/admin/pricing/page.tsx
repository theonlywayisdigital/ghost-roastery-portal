import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPricingManager } from "./AdminPricingManager";

export default async function AdminPricingPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  return <AdminPricingManager />;
}

export const metadata = {
  title: "Pricing Management | Ghost Roastery Admin",
};
