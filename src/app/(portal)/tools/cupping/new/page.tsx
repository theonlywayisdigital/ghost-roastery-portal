import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CuppingForm } from "../CuppingForm";

export default async function NewCuppingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <CuppingForm />;
}
