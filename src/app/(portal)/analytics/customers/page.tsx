import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user?.roaster) redirect("/login");
  return <CustomersClient />;
}
