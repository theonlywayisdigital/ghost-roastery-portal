import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) redirect("/dashboard");

  const { id } = await params;
  return (
    <InvoiceDetail
      invoiceId={id}
      ownerType="ghost_roastery"
      backHref="/admin/finance"
    />
  );
}
