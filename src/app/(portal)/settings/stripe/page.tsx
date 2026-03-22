import { ComingSoon } from "@/components/ComingSoon";
import { CreditCard } from "@/components/icons";

export default function StripeConnectSettingsPage() {
  return (
    <ComingSoon
      title="Stripe Connect"
      description="Connect or manage your Stripe account to accept payments through your wholesale portal."
      icon={CreditCard}
    />
  );
}
