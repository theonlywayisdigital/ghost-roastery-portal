import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MyOrdersClient } from "./MyOrdersClient";

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">My Orders</h1>
      <p className="text-slate-500 mb-8">
        Track all your orders across Ghost Roastery and partner storefronts.
      </p>
      <MyOrdersClient />
    </>
  );
}
