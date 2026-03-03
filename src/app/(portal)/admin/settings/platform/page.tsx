import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PlatformSettingsClient } from "./PlatformSettingsClient";

export default async function PlatformSettingsPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return <PlatformSettingsClient />;
}
