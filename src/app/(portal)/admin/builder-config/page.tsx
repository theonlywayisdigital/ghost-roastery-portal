import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminBuilderConfig } from "./AdminBuilderConfig";

export default async function AdminBuilderConfigPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    redirect("/dashboard");
  }

  return <AdminBuilderConfig />;
}

export const metadata = {
  title: "Builder Config | Roastery Platform Admin",
};
