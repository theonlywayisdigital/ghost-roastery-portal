import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyUnsubscribeToken } from "@/lib/marketing-email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(renderUnsubscribePage("Invalid unsubscribe link."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return new NextResponse(renderUnsubscribePage("This unsubscribe link is invalid or has expired."), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Unsubscribe the contact and revoke marketing consent
  await supabase
    .from("contacts")
    .update({ unsubscribed: true, unsubscribed_at: now, marketing_consent: false })
    .eq("roaster_id", payload.roasterId)
    .eq("email", payload.email);

  return new NextResponse(
    renderUnsubscribePage("You have been unsubscribed and will no longer receive marketing emails from this sender."),
    { headers: { "Content-Type": "text/html" } }
  );
}

function renderUnsubscribePage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe</title>
  <style>
    body { margin: 0; padding: 40px 20px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .card { max-width: 480px; margin: 80px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 40px; text-align: center; }
    h1 { color: #0f172a; font-size: 20px; margin: 0 0 12px; }
    p { color: #64748b; font-size: 15px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email Preferences</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
