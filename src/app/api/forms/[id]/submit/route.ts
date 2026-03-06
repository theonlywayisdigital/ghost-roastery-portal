import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { fireAutomationTrigger, updateContactActivity } from "@/lib/automation-triggers";
import { findOrCreatePerson } from "@/lib/people";
import { Resend } from "resend";
import { wrapEmailWithBranding, emailButton, EmailBranding } from "@/lib/email-template";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_DOMAIN = "ghostroasting.co.uk";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Get form
    const { data: form } = await supabase
      .from("forms")
      .select("*, partner_roasters(id, user_id, business_name)")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (!form) {
      return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
    }

    const settings = (form.settings || {}) as Record<string, unknown>;
    const fields = (form.fields || []) as { id: string; type: string; label: string; required: boolean }[];
    const roaster = form.partner_roasters as { id: string; user_id: string; business_name: string } | null;

    // Validate required fields
    const data = body.data as Record<string, unknown>;
    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    for (const field of fields) {
      if (field.required && !data[field.id]) {
        return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
      }
    }

    // Validate email format
    const emailField = fields.find((f) => f.type === "email");
    if (emailField && data[emailField.id]) {
      const email = String(data[emailField.id]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
      }
    }

    // Check GDPR consent
    if (settings.gdpr_consent_required && !body.consent) {
      return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    }

    // Rate limiting: check IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") || "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("form_id", id)
      .eq("ip_address", ip)
      .gte("created_at", oneHourAgo);

    if ((recentCount || 0) >= 10) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    // Fetch roaster branding for email templates
    let branding: EmailBranding | undefined;
    if (roaster) {
      const { data: rb } = await supabase
        .from("partner_roasters")
        .select("brand_logo_url, brand_primary_colour, brand_accent_colour, brand_heading_font, brand_body_font, brand_tagline")
        .eq("id", roaster.id)
        .single();
      if (rb) {
        branding = {
          logoUrl: rb.brand_logo_url,
          primaryColour: rb.brand_primary_colour || undefined,
          accentColour: rb.brand_accent_colour || undefined,
          headingFont: rb.brand_heading_font || undefined,
          bodyFont: rb.brand_body_font || undefined,
          tagline: rb.brand_tagline || undefined,
        };
      }
    }

    // Determine if double opt-in
    const doubleOptIn = Boolean(settings.double_opt_in);
    const verificationToken = doubleOptIn ? crypto.randomBytes(32).toString("hex") : null;

    // Save submission
    const { data: submission, error: submitError } = await supabase
      .from("form_submissions")
      .insert({
        form_id: id,
        data,
        source: body.source || "hosted",
        ip_address: ip,
        consent_given: Boolean(body.consent),
        consent_text: (settings.gdpr_consent_text as string) || null,
        email_verified: !doubleOptIn,
        verification_token: verificationToken,
      })
      .select("id")
      .single();

    if (submitError) {
      console.error("Form submission error:", submitError);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    // Increment submission count
    const { data: currentForm } = await supabase
      .from("forms")
      .select("submission_count")
      .eq("id", id)
      .single();

    if (currentForm) {
      await supabase
        .from("forms")
        .update({ submission_count: (currentForm.submission_count || 0) + 1 })
        .eq("id", id);
    }

    // Send verification email if double opt-in
    if (doubleOptIn && verificationToken && emailField && data[emailField.id]) {
      const email = String(data[emailField.id]);
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "";
      const verifyUrl = `${portalUrl}/api/forms/verify?token=${verificationToken}`;
      const subject = (settings.double_opt_in_email_subject as string) || "Please confirm your subscription";

      try {
        const businessName = roaster?.business_name || "Ghost Roastery";
        const bodyHtml = `
          <h1 style="color:#0f172a;font-size:20px;margin:0 0 16px;">${subject}</h1>
          <p style="color:#334155;font-size:15px;line-height:24px;margin:4px 0;">
            ${(settings.double_opt_in_email_body as string) || "Please click the button below to confirm your subscription."}
          </p>
          ${emailButton({ href: verifyUrl, label: "Confirm Subscription", branding })}
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            If you didn't request this, you can ignore this email.
          </p>
        `;

        await resend.emails.send({
          from: `${businessName} <noreply@${FROM_DOMAIN}>`,
          to: email,
          subject,
          html: wrapEmailWithBranding({ body: bodyHtml, businessName, branding }),
        });
      } catch (e) {
        console.error("Failed to send verification email:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Check your email to confirm your subscription.",
        requires_verification: true,
      });
    }

    // No double opt-in — create contact immediately
    if (settings.auto_create_contact && roaster) {
      const contactId = await createOrUpdateContact(supabase, form, data, submission.id, roaster.id);

      // Fire automation triggers for form submission
      if (contactId && roaster) {
        fireAutomationTrigger({
          trigger_type: "form_submitted",
          roaster_id: roaster.id,
          contact_id: contactId,
          event_data: { form_id: id },
          context: { form_data: data },
        }).catch(() => {});
        updateContactActivity(contactId).catch(() => {});
      }
    }

    // Notify roaster
    if (roaster?.user_id) {
      const submitterName = (data.name || data.first_name || data.email || "Someone") as string;
      await createNotification({
        userId: roaster.user_id,
        type: "form_submission",
        title: "New form submission",
        body: `${submitterName} submitted "${form.name}".`,
        link: `/marketing/forms/${id}/submissions`,
        metadata: { form_id: id, submission_id: submission.id },
      });

      // Send email notification if enabled
      if (settings.notification_email && roaster.business_name) {
        const roasterEmail = await getNotificationEmail(supabase, roaster.id);
        if (roasterEmail) {
          try {
            const bodyHtml = `
              <h1 style="color:#0f172a;font-size:20px;margin:0 0 16px;">New Form Submission</h1>
              <p style="color:#334155;font-size:15px;line-height:24px;margin:4px 0 16px;">
                You received a new submission on &ldquo;${form.name}&rdquo;.
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
              from: `Ghost Roastery Platform <noreply@${FROM_DOMAIN}>`,
              to: roasterEmail,
              subject: `New submission: ${form.name}`,
              html: wrapEmailWithBranding({ body: bodyHtml, businessName: roaster.business_name, branding }),
            });
          } catch (e) {
            console.error("Failed to send notification email:", e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: (settings.success_message as string) || "Thanks for your submission!",
      redirect_url: (settings.redirect_url as string) || null,
    });
  } catch (error) {
    console.error("Form submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function createOrUpdateContact(
  supabase: ReturnType<typeof createServerClient>,
  form: Record<string, unknown>,
  data: Record<string, unknown>,
  submissionId: string,
  roasterId: string
): Promise<string | null> {
  const settings = (form.settings || {}) as Record<string, unknown>;
  const email = (data.email as string)?.toLowerCase();
  if (!email) return null;

  // Check if contact exists
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, types")
    .eq("roaster_id", roasterId)
    .eq("email", email)
    .single();

  if (existing) {
    // Update existing contact, add lead type if not present
    const types = (existing.types as string[]) || [];
    if (!types.includes("lead")) {
      await supabase
        .from("contacts")
        .update({ types: [...types, "lead"] })
        .eq("id", existing.id);
    }

    // Link submission
    await supabase
      .from("form_submissions")
      .update({ contact_id: existing.id })
      .eq("id", submissionId);

    // Log activity
    await supabase.from("contact_activity").insert({
      contact_id: existing.id,
      activity_type: "form_submitted",
      description: `Submitted form: ${form.name}`,
    });

    return existing.id;
  } else {
    // Create new contact
    const firstName = (data.first_name || data.name || "") as string;
    const lastName = (data.last_name || "") as string;
    const phone = (data.phone || "") as string;
    const businessName = (data.business_name || "") as string;
    const defaultType = (settings.default_contact_type as string) || "lead";

    const peopleId = await findOrCreatePerson(supabase, email, firstName, lastName, phone || null);

    const { data: contact } = await supabase
      .from("contacts")
      .insert({
        roaster_id: roasterId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        business_name: businessName || null,
        types: [defaultType],
        source: "form",
        lead_status: defaultType === "lead" ? "new" : null,
        people_id: peopleId,
        owner_id: roasterId,
        contact_type: defaultType,
      })
      .select("id")
      .single();

    if (contact) {
      await supabase
        .from("form_submissions")
        .update({ contact_id: contact.id })
        .eq("id", submissionId);

      await supabase.from("contact_activity").insert({
        contact_id: contact.id,
        activity_type: "contact_created",
        description: `Contact created from form: ${form.name}`,
      });
    }

    // Auto-create business if configured
    if (settings.auto_create_business && businessName && contact) {
      const { data: biz } = await supabase
        .from("businesses")
        .insert({
          roaster_id: roasterId,
          name: businessName,
          type: "lead",
          primary_contact_id: contact.id,
        })
        .select("id")
        .single();

      if (biz) {
        await supabase
          .from("contacts")
          .update({ business_id: biz.id })
          .eq("id", contact.id);

        await supabase
          .from("form_submissions")
          .update({ business_id: biz.id })
          .eq("id", submissionId);
      }
    }

    return contact?.id || null;
  }

  return null;
}

async function getNotificationEmail(
  supabase: ReturnType<typeof createServerClient>,
  roasterId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("partner_roasters")
    .select("email")
    .eq("id", roasterId)
    .single();

  return data?.email || null;
}
