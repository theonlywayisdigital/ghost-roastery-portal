import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { findOrCreatePerson } from "@/lib/people";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { Resend } from "resend";
import { getVerifiedDomain } from "@/lib/email";
import { wrapEmailWithBranding, EmailBranding } from "@/lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_DOMAIN = "roasteryplatform.com";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return htmlResponse("Invalid Link", "This verification link is invalid or incomplete.");
  }

  const supabase = createServerClient();

  // Find submission by token
  const { data: submission } = await supabase
    .from("form_submissions")
    .select("id, form_id, data, email_verified, consent_given, forms(id, name, form_type, settings, roaster_id, roasters(id, user_id, business_name))")
    .eq("verification_token", token)
    .single();

  if (!submission) {
    return htmlResponse("Link Expired", "This verification link is invalid or has already been used.");
  }

  if (submission.email_verified) {
    return htmlResponse("Already Confirmed", "Your subscription has already been confirmed. Thank you!");
  }

  // Mark as verified
  await supabase
    .from("form_submissions")
    .update({
      email_verified: true,
      verified_at: new Date().toISOString(),
      verification_token: null,
    })
    .eq("id", submission.id);

  // Create contact
  const form = submission.forms as unknown as Record<string, unknown>;
  if (form) {
    const settings = (form.settings || {}) as Record<string, unknown>;
    const roaster = form.roasters as { id: string; user_id: string; business_name: string } | null;
    const data = submission.data as Record<string, unknown>;
    const email = (data.email as string)?.toLowerCase();

    // Verified double-opt-in: newsletter forms always get marketing_consent = true,
    // other forms use the GDPR checkbox value from the original submission
    const isNewsletter = (form.form_type as string) === "newsletter";
    const marketingConsent = isNewsletter ? true : Boolean(submission.consent_given);

    let contactId: string | null = null;

    if (settings.auto_create_contact !== false && email && roaster) {
      // Check if contact exists
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, types")
        .eq("roaster_id", roaster.id)
        .eq("email", email)
        .single();

      if (existing) {
        contactId = existing.id;
        const types = (existing.types as string[]) || [];
        const contactUpdates: Record<string, unknown> = {};
        if (marketingConsent) {
          contactUpdates.marketing_consent = true;
        }
        if (!types.includes("lead")) {
          contactUpdates.types = [...types, "lead"];
        }
        if (Object.keys(contactUpdates).length > 0) {
          await supabase.from("contacts").update(contactUpdates).eq("id", existing.id);
        }
        await supabase.from("form_submissions").update({ contact_id: existing.id }).eq("id", submission.id);
      } else {
        const defaultType = (settings.default_contact_type as string) || "lead";
        const firstName = (data.first_name || data.name || "") as string;
        const lastName = (data.last_name || "") as string;
        const phone = (data.phone as string) || null;

        const peopleId = await findOrCreatePerson(supabase, email, firstName, lastName, phone);

        const { data: contact } = await supabase
          .from("contacts")
          .insert({
            roaster_id: roaster.id,
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            types: [defaultType],
            source: "form",
            people_id: peopleId,
            owner_id: roaster.id,
            marketing_consent: marketingConsent,
          })
          .select("id")
          .single();

        if (contact) {
          contactId = contact.id;
          await supabase.from("form_submissions").update({ contact_id: contact.id }).eq("id", submission.id);
        }
      }

      // Fire automation trigger for form submission (matches non-double-opt-in path)
      if (contactId) {
        fireAutomationTrigger({
          trigger_type: "form_submitted",
          roaster_id: roaster.id,
          contact_id: contactId,
          event_data: { form_id: form.id as string },
          context: { form_data: data },
        }).catch(() => {});
        updateContactActivity(contactId).catch(() => {});
      }
    }

    // Notify roaster (in-app + email)
    if (roaster?.user_id) {
      await createNotification({
        userId: roaster.user_id,
        type: "form_submission",
        title: "Subscription confirmed",
        body: `${(data.email || "A subscriber") as string} confirmed their subscription via "${form.name}".`,
        link: `/marketing/forms/${form.id}/submissions`,
      });

      // Send email notification if enabled (default: on)
      if (settings.notification_email !== false && roaster.business_name) {
        try {
          const { data: roasterRow } = await supabase
            .from("roasters")
            .select("email, brand_logo_url, storefront_logo_size, storefront_button_colour, storefront_button_text_colour, storefront_button_style, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
            .eq("id", roaster.id)
            .single();

          if (roasterRow?.email) {
            const branding: EmailBranding | undefined = roasterRow ? {
              logoUrl: roasterRow.brand_logo_url,
              logoSize: roasterRow.storefront_logo_size || "medium",
              buttonColour: roasterRow.storefront_button_colour || undefined,
              buttonTextColour: roasterRow.storefront_button_text_colour || undefined,
              buttonStyle: (roasterRow.storefront_button_style as "sharp" | "rounded" | "pill") || "rounded",
              primaryColour: roasterRow.brand_primary_colour || undefined,
              accentColour: roasterRow.brand_accent_colour || undefined,
              headingFont: roasterRow.brand_heading_font || undefined,
              bodyFont: roasterRow.brand_body_font || undefined,
              tagline: roasterRow.brand_tagline || undefined,
            } : undefined;

            const customDomain = await getVerifiedDomain(roaster.id);
            const bodyHtml = `
              <h1 style="color:#0f172a;font-size:20px;margin:0 0 16px;">Subscription Confirmed</h1>
              <p style="color:#334155;font-size:15px;line-height:24px;margin:4px 0 16px;">
                ${(data.email || "A subscriber") as string} confirmed their subscription via &ldquo;${form.name}&rdquo;.
              </p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
                ${Object.entries(data).map(([key, val]) => `
                  <tr>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#374151;width:140px;">${key}</td>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;">${String(val)}</td>
                  </tr>
                `).join("")}
              </table>
            `;

            await resend.emails.send({
              from: `Roastery Platform <${customDomain?.senderPrefix || "noreply"}@${customDomain?.domain || FROM_DOMAIN}>`,
              to: roasterRow.email,
              subject: `Subscription confirmed: ${form.name}`,
              html: wrapEmailWithBranding({ body: bodyHtml, businessName: roaster.business_name, branding }),
            });
          }
        } catch (e) {
          console.error("Failed to send verification notification email:", e);
        }
      }
    }
  }

  return htmlResponse(
    "Subscription Confirmed!",
    "Thank you for confirming. You're now subscribed.",
    true
  );
}

function htmlResponse(title: string, message: string, success = false): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 400px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin: 0 0 12px; }
    p { color: #64748b; font-size: 16px; line-height: 1.5; margin: 0; }
    .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✓" : "⚠"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
