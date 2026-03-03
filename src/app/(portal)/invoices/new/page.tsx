import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export default async function RoasterNewInvoicePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster")) redirect("/dashboard");

  return (
    <InvoiceEditor
      ownerType="roaster"
      backHref="/invoices"
      successHref="/invoices"
    />
  );
}
