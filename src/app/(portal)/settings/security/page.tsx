import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SecurityPage } from "./SecurityPage";

export default async function SecuritySettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <SecurityPage />;
}
