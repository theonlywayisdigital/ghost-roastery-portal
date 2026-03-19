import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export default async function AdminEditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;
  return (
    <InvoiceEditor
      ownerType="ghost_roastery"
      backHref={`/admin/finance/invoices/${id}`}
      successHref="/admin/finance/invoices"
      invoiceId={id}
      mode="edit"
    />
  );
}
