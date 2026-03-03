import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OrderDetailPage } from "./OrderDetailPage";

export default async function RoasterOrderDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) redirect("/login");

  const { id } = await params;
  const { type } = await searchParams;

  return <OrderDetailPage orderId={id} orderType={type || "wholesale"} />;
}
