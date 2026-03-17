import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { processOrder } from "@/lib/order-processing";
import { extractSessionMetadata } from "@/lib/order-metadata";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripePaymentId = (session.payment_intent as string) || session.id;
    const metadata = session.metadata || {};
    const params = extractSessionMetadata(metadata, stripePaymentId);

    if (params) {
      const result = await processOrder(params);
      if (!result.success && !result.alreadyExists) {
        console.error("Webhook order processing failed:", result.error);
      }
    } else {
      console.error("Missing metadata in checkout session:", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
