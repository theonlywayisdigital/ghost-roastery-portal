import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkFeature } from "@/lib/feature-gates";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

export default async function RoasterNewInvoicePage() {
  const user = await getCurrentUser();
  if (!user?.roles.includes("roaster") || !user.roaster) redirect("/dashboard");

  const gate = await checkFeature(user.roaster.id, "invoices");
  if (!gate.allowed) {
    return <FeatureGate featureName="Invoices" requiredTier={gate.requiredTier} productType={gate.requiredProduct} />;
  }

  return (
    <InvoiceEditor
      ownerType="roaster"
      backHref="/invoices"
      successHref="/invoices"
    />
  );
}
