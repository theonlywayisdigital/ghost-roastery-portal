import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EmailTemplatesPage } from "./EmailTemplatesPage";

export default async function EmailTemplatesSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <EmailTemplatesPage />;
}
