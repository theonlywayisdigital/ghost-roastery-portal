import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CreateOrderPage } from "./CreateOrderPage";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  return <CreateOrderPage roasterId={user.roaster.id} />;
}
