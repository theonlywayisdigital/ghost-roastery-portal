import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BusinessPage } from "./BusinessPage";

export default async function BusinessSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <BusinessPage roasterId={user.roaster.id as string} />;
}
