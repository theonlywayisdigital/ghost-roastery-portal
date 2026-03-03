import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TeamPage } from "./TeamPage";

export default async function TeamSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <TeamPage currentUserId={user.id} />;
}
