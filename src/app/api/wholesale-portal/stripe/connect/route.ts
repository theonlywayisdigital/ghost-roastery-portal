import { NextResponse } from "next/server";
import { getCurrentRoaster } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const roaster = await getCurrentRoaster();
  if (!roaster) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Optional: caller can specify return path
  let returnPath = "/wholesale-portal/setup?stripe=complete";
  let refreshPath = "/wholesale-portal/setup?stripe=refresh";
  try {
    const body = await request.json();
    if (body.returnPath) {
      returnPath = body.returnPath;
      refreshPath = body.refreshPath || body.returnPath;
    }
  } catch {
    // No body or not JSON — use defaults
  }

  try {
    let accountId = roaster.stripe_account_id as string | null;

    // Create Express account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: roaster.email as string,
        business_profile: {
          name: roaster.business_name as string,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      await supabase
        .from("roasters")
        .update({ stripe_account_id: accountId })
        .eq("id", roaster.id);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}${refreshPath}`,
      return_url: `${process.env.NEXT_PUBLIC_PORTAL_URL}${returnPath}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}
