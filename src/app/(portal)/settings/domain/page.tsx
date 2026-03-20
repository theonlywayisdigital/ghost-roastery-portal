import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";
import { DomainPage } from "./DomainPage";

export default async function DomainRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const roaster = await getCurrentRoaster();
  if (!roaster) redirect("/settings");

  return (
    <DomainPage
      slug={(roaster.storefront_slug as string) || null}
      businessName={roaster.business_name}
    />
  );
}
