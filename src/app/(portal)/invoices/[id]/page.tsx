import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export default async function RoasterInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster")) redirect("/dashboard");

  const { id } = await params;
  return (
    <InvoiceDetail
      invoiceId={id}
      ownerType="roaster"
      backHref="/invoices"
    />
  );
}
