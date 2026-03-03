import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoicesPage } from "./InvoicesPage";

export default async function RoasterInvoicesPage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster")) redirect("/dashboard");

  return <InvoicesPage />;
}
