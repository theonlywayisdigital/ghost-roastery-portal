import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export default async function AdminNewInvoicePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  return (
    <InvoiceEditor
      ownerType="ghost_roastery"
      backHref="/admin/finance"
      successHref="/admin/finance/invoices"
    />
  );
}
