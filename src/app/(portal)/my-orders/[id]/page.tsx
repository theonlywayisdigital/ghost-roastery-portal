import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CustomerOrderDetail } from "./CustomerOrderDetail";

export default async function CustomerOrderDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { type } = await searchParams;

  return <CustomerOrderDetail orderId={id} orderType={type || "ghost"} />;
}
