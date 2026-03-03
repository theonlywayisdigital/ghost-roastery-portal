import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfilePage } from "./ProfilePage";

export default async function ProfileSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ProfilePage userId={user.id} email={user.email} />;
}
