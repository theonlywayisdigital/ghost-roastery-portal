import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export default async function RoasterInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) redirect("/dashboard");

  const gate = await checkFeature(user.roaster.id, "invoices");
  if (!gate.allowed) {
    return <FeatureGate featureName="Invoices" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  const { id } = await params;
  return (
    <InvoiceDetail
      invoiceId={id}
      ownerType="roaster"
      backHref="/invoices"
    />
  );
}
