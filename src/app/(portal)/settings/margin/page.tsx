import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MarginSettingsForm } from "./MarginSettingsForm";

export default async function MarginSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <MarginSettingsForm />;
}
