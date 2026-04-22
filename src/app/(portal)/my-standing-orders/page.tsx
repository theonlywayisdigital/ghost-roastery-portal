import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MyStandingOrdersClient } from "./MyStandingOrdersClient";

export default async function MyStandingOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Standing Orders</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your recurring wholesale orders
        </p>
      </div>
      <MyStandingOrdersClient />
    </div>
  );
}
