import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roaster?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: webhook } = await supabase
    .from("roaster_webhooks")
    .select("*")
    .eq("id", id)
    .eq("roaster_id", user.roaster.id)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const testPayload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook from Roastery Platform",
      webhook_id: webhook.id,
      roaster_id: user.roaster.id,
    },
  };

  const body = JSON.stringify(testPayload);
  const signature = crypto
    .createHmac("sha256", webhook.secret)
    .update(body)
    .digest("hex");

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GR-Signature": signature,
        "X-GR-Webhook-Id": webhook.id,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    return NextResponse.json({
      success: true,
      status: res.status,
      statusText: res.statusText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}
