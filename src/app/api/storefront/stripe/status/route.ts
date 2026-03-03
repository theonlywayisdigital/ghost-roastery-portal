import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = roaster.stripe_account_id as string | null;

  if (!accountId) {
    return NextResponse.json({
      connected: false,
      onboarding_complete: false,
      charges_enabled: false,
      payouts_enabled: false,
      external_accounts: [],
      requirements: null,
    });
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    // Get external accounts (bank accounts)
    const externalAccounts = (account.external_accounts?.data || []).map(
      (ea) => ({
        id: ea.id,
        last4: "last4" in ea ? ea.last4 : null,
        bank_name: "bank_name" in ea ? ea.bank_name : null,
        type: ea.object,
      })
    );

    return NextResponse.json({
      connected: true,
      onboarding_complete: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      external_accounts: externalAccounts,
      requirements: account.requirements
        ? {
            currently_due: account.requirements.currently_due || [],
            eventually_due: account.requirements.eventually_due || [],
            past_due: account.requirements.past_due || [],
            errors: account.requirements.errors || [],
          }
        : null,
    });
  } catch (error) {
    console.error("Stripe status error:", error);
    return NextResponse.json({
      connected: true,
      onboarding_complete: false,
      charges_enabled: false,
      payouts_enabled: false,
      external_accounts: [],
      requirements: null,
    });
  }
}
