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
    return NextResponse.json({ payouts: [], connected: false });
  }

  try {
    const payouts = await stripe.payouts.list(
      { limit: 20 },
      { stripeAccount: accountId }
    );

    const formatted = payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      arrival_date: new Date(p.arrival_date * 1000).toISOString(),
      created: new Date(p.created * 1000).toISOString(),
      destination:
        p.destination && typeof p.destination === "object" && "last4" in p.destination
          ? `****${p.destination.last4}`
          : typeof p.destination === "string"
            ? p.destination
            : null,
    }));

    return NextResponse.json({ payouts: formatted, connected: true });
  } catch (error) {
    console.error("Payouts fetch error:", error);
    return NextResponse.json({ payouts: [], connected: true });
  }
}
