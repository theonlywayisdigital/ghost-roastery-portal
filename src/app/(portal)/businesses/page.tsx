import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BusinessesCRM } from "./BusinessesCRM";

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/dashboard");

  return <BusinessesCRM />;
}
