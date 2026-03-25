import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SalesClient } from "./SalesClient";

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user?.roaster) redirect("/login");
  return <SalesClient />;
}
