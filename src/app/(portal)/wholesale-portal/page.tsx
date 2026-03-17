import { redirect } from "next/navigation";
import { getCurrentRoaster } from "@/lib/auth";

export default async function StorefrontPage() {
  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/login");

  if (!roaster.storefront_setup_complete) {
    redirect("/wholesale-portal/setup");
  }

  redirect("/wholesale-portal/content");
}
