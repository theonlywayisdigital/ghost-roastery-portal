import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MyInvoicesPage } from "./MyInvoicesPage";

export default async function CustomerInvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <MyInvoicesPage />;
}
