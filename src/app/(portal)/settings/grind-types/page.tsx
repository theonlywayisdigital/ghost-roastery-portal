import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GrindTypesPage } from "./GrindTypesPage";

export default async function GrindTypesSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <GrindTypesPage />;
}
