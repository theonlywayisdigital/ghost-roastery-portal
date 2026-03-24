import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { Resend } from "resend";
import { wrapEmailWithBranding } from "@/lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Roastery Platform <noreply@roasteryplatform.com>";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { templateKey, subject, bodyText, recipientEmail, orderType } = body as {
    templateKey?: string;
    subject: string;
    bodyText: string;
    recipientEmail: string;
    orderType: string;
  };

  if (!subject || !bodyText || !recipientEmail) {
    return NextResponse.json(
      { error: "Subject, body, and recipient are required" },
      { status: 400 }
    );
  }

  // Fetch platform branding
  const supabase = createServerClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
    .limit(1)
    .single();

  const branding = settings ? {
    logoUrl: settings.brand_logo_url,
    primaryColour: settings.brand_primary_colour || undefined,
    accentColour: settings.brand_accent_colour || undefined,
    headingFont: settings.brand_heading_font || undefined,
    bodyFont: settings.brand_body_font || undefined,
    tagline: settings.brand_tagline || undefined,
  } : undefined;

  const bodyHtml = `
    <h1 style="color:#0f172a;font-size:20px;margin:0 0 16px;">${subject}</h1>
    ${bodyText.split("\n").map((line: string) => `<p style="color:#334155;font-size:15px;line-height:24px;margin:4px 0;">${line || "&nbsp;"}</p>`).join("")}
  `;

  // Send email
  await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html: wrapEmailWithBranding({ body: bodyHtml, businessName: "Roastery Platform", branding }),
  });

  // Save to communications log
  await supabase.from("order_communications").insert({
    order_id: id,
    order_type: orderType || "ghost",
    template_key: templateKey || null,
    subject,
    body: bodyText,
    recipient_email: recipientEmail,
    sent_by: user.id,
  });

  // Log activity
  await supabase.from("order_activity_log").insert({
    order_id: id,
    order_type: orderType || "ghost",
    action: "email_sent",
    description: `Email sent to ${recipientEmail}: ${subject}`,
    actor_id: user.id,
    actor_name: user.email,
  });

  return NextResponse.json({ success: true });
}
