import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OrdersPage } from "./OrdersPage";

export default async function RoasterOrdersPage() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  // A roaster is an active Roastery Platform partner if they are flagged as such
  // in partner_roasters — NOT based on whether they have existing orders
  const isPartner =
    user.roaster.is_ghost_roaster &&
    user.roaster.is_verified &&
    user.roaster.is_active;

  return <OrdersPage roasterId={user.roaster.id} isPartner={isPartner} />;
}
