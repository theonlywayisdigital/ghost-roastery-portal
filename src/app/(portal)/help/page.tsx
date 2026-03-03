import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { HelpCentre } from "./HelpCentre";

export default async function HelpCentrePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <HelpCentre />;
}
