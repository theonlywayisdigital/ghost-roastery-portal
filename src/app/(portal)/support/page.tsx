import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SupportDashboard } from "./SupportDashboard";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <SupportDashboard />;
}
