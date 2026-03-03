import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export default async function CustomerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  return (
    <InvoiceDetail
      invoiceId={id}
      ownerType="roaster"
      backHref="/my-invoices"
      readOnly
    />
  );
}
