import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { processOrder } from "@/lib/order-processing";
import { extractSessionMetadata } from "@/lib/order-metadata";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Missing session_id." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed." },
        { status: 400 }
      );
    }

    const stripePaymentId = (session.payment_intent as string) || session.id;
    const metadata = session.metadata || {};
    const params = extractSessionMetadata(metadata, stripePaymentId);

    if (!params) {
      return NextResponse.json(
        { error: "Invalid session metadata." },
        { status: 400 }
      );
    }

    const result = await processOrder(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to confirm order." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      customerEmail: result.customerEmail,
      customerName: result.customerName,
    });
  } catch (error) {
    console.error("Confirm order error:", error);
    return NextResponse.json(
      { error: "Failed to confirm order." },
      { status: 500 }
    );
  }
}
