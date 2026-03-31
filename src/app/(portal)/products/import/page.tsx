import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";
import { ImportWizard } from "./ImportWizard";

export default async function ImportPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  return <ImportWizard />;
}
