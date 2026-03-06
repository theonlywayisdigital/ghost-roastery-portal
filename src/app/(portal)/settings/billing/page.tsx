import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BillingPage } from "./BillingPage";

export default async function BillingSettingsRoute() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roaster) redirect("/settings");

  return (
    <BillingPage
      roaster={{
        id: user.roaster.id as string,
        business_name: user.roaster.business_name as string,
        email: user.roaster.email as string,
        address_line1: (user.roaster.address_line1 as string) || "",
        address_line2: (user.roaster.address_line2 as string) || "",
        city: (user.roaster.city as string) || "",
        postcode: (user.roaster.postcode as string) || "",
        country: (user.roaster.country as string) || "GB",
        vat_number: (user.roaster.vat_number as string) || "",
        billing_email: (user.roaster.billing_email as string) || (user.roaster.email as string) || "",
        platform_fee_percent: (user.roaster.platform_fee_percent as number) ?? 4.0,
        stripe_account_id: (user.roaster.stripe_account_id as string) || null,
        storefront_logo_url: (user.roaster.storefront_logo_url as string) || null,
        invoice_prefix: (user.roaster.invoice_prefix as string) || "INV",
        default_payment_terms: (user.roaster.default_payment_terms as number) ?? 30,
        invoice_currency: (user.roaster.invoice_currency as string) || "GBP",
        bank_name: (user.roaster.bank_name as string) || "",
        bank_account_number: (user.roaster.bank_account_number as string) || "",
        bank_sort_code: (user.roaster.bank_sort_code as string) || "",
        payment_instructions: (user.roaster.payment_instructions as string) || "",
        late_payment_terms: (user.roaster.late_payment_terms as string) || "",
        auto_send_invoices: (user.roaster.auto_send_invoices as boolean) ?? false,
        invoice_reminder_enabled: (user.roaster.invoice_reminder_enabled as boolean) ?? false,
        reminder_days_before_due: (user.roaster.reminder_days_before_due as number) ?? 7,
        sales_tier: (user.roaster.sales_tier as string) || "free",
        marketing_tier: (user.roaster.marketing_tier as string) || "free",
        sales_billing_cycle: (user.roaster.sales_billing_cycle as string) || null,
        marketing_billing_cycle: (user.roaster.marketing_billing_cycle as string) || null,
        subscription_status: (user.roaster.subscription_status as string) || null,
        stripe_customer_id: (user.roaster.stripe_customer_id as string) || null,
        stripe_sales_subscription_id: (user.roaster.stripe_sales_subscription_id as string) || null,
        stripe_marketing_subscription_id: (user.roaster.stripe_marketing_subscription_id as string) || null,
        tier_override_by: (user.roaster.tier_override_by as string) || null,
        website_subscription_active: (user.roaster.website_subscription_active as boolean) ?? false,
        website_billing_cycle: (user.roaster.website_billing_cycle as string) || null,
        stripe_website_subscription_id: (user.roaster.stripe_website_subscription_id as string) || null,
      }}
    />
  );
}
