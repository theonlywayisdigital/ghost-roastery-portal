import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PipelineStagesPage } from "./PipelineStagesPage";

export default async function PipelineStagesSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return <PipelineStagesPage />;
}
