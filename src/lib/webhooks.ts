import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

/**
 * All supported webhook event types.
 */
export const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.paid",
  "order.placed",
  "order.cancelled",
  "buyer.approved",
  "contact.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Dispatch a webhook event to all active subscribers for a roaster.
 * Fire-and-forget — does not block the caller.
 */
export function dispatchWebhook(
  roasterId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  // Fire-and-forget: don't await, don't block
  void dispatchWebhookAsync(roasterId, event, payload);
}

async function dispatchWebhookAsync(
  roasterId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const supabase = createServerClient();

    const { data: webhooks } = await supabase
      .from("roaster_webhooks")
      .select("id, url, secret, events")
      .eq("roaster_id", roasterId)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) return;

    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event, timestamp, data: payload });

    const deliveries = webhooks
      .filter((wh) => {
        // null/empty events array means "subscribe to all"
        if (!wh.events || wh.events.length === 0) return true;
        return wh.events.includes(event);
      })
      .map((wh) => deliverWebhook(wh.id, wh.url, wh.secret, body));

    await Promise.allSettled(deliveries);
  } catch (err) {
    console.error(`[webhook] Failed to dispatch ${event} for roaster ${roasterId}:`, err);
  }
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  body: string
) {
  try {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GR-Signature": signature,
        "X-GR-Webhook-Id": webhookId,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(
        `[webhook] ${webhookId} delivery failed: ${res.status} ${res.statusText} → ${url}`
      );
    }
  } catch (err) {
    console.error(`[webhook] ${webhookId} delivery error → ${url}:`, err);
  }
}
