import type { ProcessOrderParams } from "@/lib/order-processing";

/**
 * Extract and normalize order parameters from Stripe session metadata.
 * Handles both verbose format (legacy) and compact format (Phase 3).
 * Returns null if required fields are missing.
 */
export function extractSessionMetadata(
  metadata: Record<string, string>,
  stripePaymentId: string
): ProcessOrderParams | null {
  const roasterId = metadata.roaster_id;
  const customerName = metadata.customer_name;
  const customerEmail = metadata.customer_email;

  if (!roasterId || !customerEmail) {
    return null;
  }

  const deliveryAddress = metadata.delivery_address
    ? JSON.parse(metadata.delivery_address)
    : null;
  const items = metadata.items ? JSON.parse(metadata.items) : [];
  const subtotalPence = parseInt(metadata.subtotal_pence || "0");
  const platformFeePence = parseInt(metadata.platform_fee_pence || "0");
  const isWholesaleChannel = metadata.wholesale === "true";
  const discountCodeId = metadata.discount_code_id || null;
  const discountCode = metadata.discount_code || null;
  const discountAmountPence = parseInt(metadata.discount_amount_pence || "0");
  const orderNotes = metadata.order_notes || null;

  return {
    stripePaymentId,
    roasterId,
    customerName,
    customerEmail,
    deliveryAddress,
    items,
    subtotalPence,
    platformFeePence,
    discountCodeId,
    discountCode,
    discountAmountPence,
    isWholesaleChannel,
    orderNotes,
  };
}
