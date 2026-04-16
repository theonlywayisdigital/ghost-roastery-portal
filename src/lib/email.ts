import { Resend } from "resend";
import { wrapEmailWithBranding, emailButton, type EmailBranding } from "@/lib/email-template";
import { createServerClient } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_DOMAIN = "roasteryplatform.com";
const FROM_EMAIL = `Roastery Platform <noreply@${DEFAULT_DOMAIN}>`;

export { type EmailBranding } from "@/lib/email-template";

/**
 * Look up a verified custom email domain for a roaster.
 * Returns { domain, senderPrefix } if found, null otherwise.
 */
export async function getVerifiedDomain(
  roasterId: string
): Promise<{ domain: string; senderPrefix: string } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("roaster_email_domains")
    .select("domain, sender_prefix")
    .eq("roaster_id", roasterId)
    .eq("status", "verified")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) return null;
  return { domain: data.domain, senderPrefix: data.sender_prefix || "noreply" };
}

function getFromEmail(
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
): string {
  const domain = customDomain?.domain || DEFAULT_DOMAIN;
  const prefix = customDomain?.senderPrefix || "noreply";
  if (branding?.businessName) {
    return `${branding.businessName} <${prefix}@${domain}>`;
  }
  return `Roastery Platform <${prefix}@${domain}>`;
}

export async function sendEmailConfirmation(
  email: string,
  contactName: string,
  confirmUrl: string
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Confirm Your Email</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">One last step to get started</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Thanks for signing up to Roastery Platform. Please confirm your email address by clicking the button below:
    </p>

    ${emailButton({ href: confirmUrl, label: "Confirm Email Address" })}

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:32px;word-break:break-all;text-align:left;">
      If the button doesn&rsquo;t work, copy and paste this link:<br/>
      <a href="${confirmUrl}" style="color:#0083dc;">${confirmUrl}</a>
    </p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your Roastery Platform email",
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform" }),
  });
}

export async function sendWelcomeEmail(
  email: string,
  contactName: string,
  businessName: string,
  branding?: EmailBranding | null
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Welcome to Roastery Platform</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Sell, market &amp; manage &mdash; built for roasters</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Your wholesale portal for <strong>${businessName}</strong> is ready. You can now:
    </p>
    <ul style="color:#334155;font-size:16px;line-height:1.8;text-align:left;padding-left:20px;">
      <li>Add your coffee products with pricing</li>
      <li>Share your portal link with wholesale customers</li>
      <li>Manage incoming orders</li>
    </ul>

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/dashboard`, label: "Go to Dashboard", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email &mdash; we&rsquo;re here to help.
    </p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Welcome to Roastery Platform, ${businessName}!`,
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform", branding }),
  });
}

export async function sendWholesaleApplicationReceived(
  email: string,
  contactName: string,
  roasterName: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Application Received</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Wholesale Trade Account</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Thanks for applying. We&rsquo;ve received your application and will be in touch once it&rsquo;s been reviewed.
    </p>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: email,
    subject: `Your wholesale application to ${roasterName}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleApplicationNotification(
  roasterEmail: string,
  roasterName: string,
  businessName: string,
  portalUrl: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">New Wholesale Application</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">${roasterName}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      <strong>${businessName}</strong> has applied for a wholesale trade account.
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Log in to your portal to review the application and approve or reject it.
    </p>

    ${emailButton({ href: `${portalUrl}/wholesale-portal/buyers`, label: "Review Application", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: roasterEmail,
    subject: `New wholesale application from ${businessName}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleApproved(
  email: string,
  contactName: string,
  roasterName: string,
  priceTier: string,
  paymentTerms: string,
  catalogueUrl: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const tierLabels: Record<string, string> = {
    standard: "Standard",
    preferred: "Preferred",
    vip: "VIP",
  };
  const termsLabels: Record<string, string> = {
    prepay: "Prepay",
    net7: "Net 7 days",
    net14: "Net 14 days",
    net30: "Net 30 days",
  };

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">You&rsquo;re Approved!</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Wholesale Trade Account</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Great news &mdash; <strong>${roasterName}</strong> has approved your wholesale account. You can now browse the catalogue and place orders.
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Price Tier:</strong> ${tierLabels[priceTier] || priceTier}</p>
      <p style="color:#334155;font-size:14px;margin:0;"><strong>Payment Terms:</strong> ${termsLabels[paymentTerms] || paymentTerms}</p>
    </div>

    ${emailButton({ href: catalogueUrl, label: "Browse Catalogue", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: email,
    subject: `Your wholesale application has been approved — ${roasterName}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleRejected(
  email: string,
  contactName: string,
  roasterName: string,
  reason: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Application Update</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Wholesale Trade Account</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Thank you for your interest. Unfortunately your application has not been successful at this time.
    </p>
    ${reason ? `
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0;"><strong>Reason:</strong> ${reason}</p>
    </div>
    ` : ""}
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Please get in touch if you have any questions.
    </p>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: email,
    subject: `Your wholesale application to ${roasterName}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleAccountSetup(
  email: string,
  contactName: string,
  roasterName: string,
  setupUrl: string,
  wholesaleUrl: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">You&rsquo;ve been invited to ${roasterName} Wholesale</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Roastery Platform</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      <strong>${roasterName}</strong> has added you as a wholesale customer.
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      To place orders, you&rsquo;ll need to set up your Roastery Platform account &mdash; the platform that powers ${roasterName}&rsquo;s wholesale store.
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      This takes less than a minute and gives you access to your orders, invoices and wholesale catalogue.
    </p>

    ${emailButton({ href: setupUrl, label: "Set Up Your Account", branding })}

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      Once set up, you can browse ${roasterName}&rsquo;s catalogue at:<br/>
      <a href="${wholesaleUrl}" style="color:#0083dc;">${wholesaleUrl}</a>
    </p>

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      This link expires in 48 hours. If you weren&rsquo;t expecting this, you can safely ignore this email.
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:32px;word-break:break-all;text-align:left;">
      If the button doesn&rsquo;t work, copy and paste this link:<br/>
      <a href="${setupUrl}" style="color:#0083dc;">${setupUrl}</a>
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center;">
      Roastery Platform is the all-in-one platform for independent coffee roasters.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: email,
    subject: `Set up your Roastery Platform account — ${roasterName} Wholesale`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleWelcome(
  email: string,
  contactName: string,
  roasterName: string,
  paymentTerms: string,
  wholesaleUrl: string,
  branding?: EmailBranding | null,
  customDomain?: { domain: string; senderPrefix: string } | null
) {
  const termsLabels: Record<string, string> = {
    prepay: "Prepay",
    net7: "Net 7 days",
    net14: "Net 14 days",
    net30: "Net 30 days",
  };

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Welcome to ${roasterName} Wholesale</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Wholesale Trade Account</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      You&rsquo;ve been added as a wholesale customer of <strong>${roasterName}</strong>.
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Sign in to your Roastery Platform account to browse their catalogue and place orders.
    </p>

    ${emailButton({ href: wholesaleUrl, label: "Sign In to Wholesale", branding })}

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0;"><strong>Payment Terms:</strong> ${termsLabels[paymentTerms] || paymentTerms}</p>
    </div>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, customDomain),
    to: email,
    subject: `You've been added to ${roasterName} Wholesale`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  contactName: string
) {
  // Password reset always uses Roastery Platform branding (platform-level)
  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Reset Your Password</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Sell, market &amp; manage &mdash; built for roasters</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${contactName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      We received a request to reset your password. Click the button below to choose a new one:
    </p>

    ${emailButton({ href: resetUrl, label: "Reset Password" })}

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      This link expires in 1 hour. If you didn&rsquo;t request this, you can safely ignore this email.
    </p>

    <p style="color:#94a3b8;font-size:12px;margin-top:32px;word-break:break-all;text-align:left;">
      If the button doesn&rsquo;t work, copy and paste this link:<br/>
      <a href="${resetUrl}" style="color:#0083dc;">${resetUrl}</a>
    </p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your Roastery Platform password",
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform" }),
  });
}

// ─── Order Cancellation Emails ───

export async function sendOrderCancellationEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  reason: string;
  wasPaid: boolean;
  branding?: EmailBranding | null;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, customerName, orderNumber, reason, wasPaid, branding } = params;

  const refundNote = wasPaid
    ? `<p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
        If you paid for this order, a refund will be processed to your original payment method within 5&ndash;10 business days.
      </p>`
    : "";

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Order Cancelled</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName || "Unknown"},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      We&rsquo;re sorry to let you know that your order <strong>#${orderNumber}</strong> has been cancelled.
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0;"><strong>Reason:</strong> ${reason}</p>
    </div>

    ${refundNote}

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_SITE_URL || "https://roasteryplatform.com"}/build`, label: "Place a New Order", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email &mdash; we&rsquo;re here to help.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Your order #${orderNumber} has been cancelled`,
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform", branding }),
  });
}

export async function sendOrderCancelledPartnerNotification(params: {
  to: string;
  partnerName: string;
  orderNumber: string;
  cancelledBy: string;
  branding?: EmailBranding | null;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, partnerName, orderNumber, cancelledBy, branding } = params;

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Order Cancelled</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${partnerName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Order <strong>#${orderNumber}</strong> has been cancelled by ${cancelledBy} and removed from your fulfilment queue.
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      No further action is required on your end.
    </p>

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/orders`, label: "View Orders", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Order #${orderNumber} has been cancelled`,
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform", branding }),
  });
}

// ─── Storefront / Wholesale Order Confirmation ───

export async function sendStorefrontOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  roasterName: string;
  branding?: EmailBranding | null;
  slug?: string;
  orderId?: string;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, customerName, orderNumber, items, total, roasterName, branding } = params;

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;">${item.name} &times; ${item.quantity}</td>
          <td style="padding:6px 0;color:#334155;font-size:14px;text-align:right;border-bottom:1px solid #f1f5f9;">&pound;${item.price.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Order Confirmed</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName || "Unknown"},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Thanks for your order with <strong>${roasterName}</strong>. We&rsquo;ve received your payment and your order is now being processed.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr>
          <th style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:2px solid #e2e8f0;">Item</th>
          <th style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:2px solid #e2e8f0;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="text-align:right;margin:8px 0 24px;">
      <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0;"><strong>Total: &pound;${total.toFixed(2)}</strong></p>
    </div>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      We&rsquo;ll send you another email with tracking details when your order is dispatched.
    </p>

    ${params.slug ? `<p style="color:#64748b;font-size:13px;margin-top:24px;text-align:center;">
      Want to track your orders and reorder easily? <a href="${process.env.NEXT_PUBLIC_PORTAL_URL}/s/${params.slug}/register" style="color:#0083dc;text-decoration:underline;">Create an account</a>
    </p>` : ""}`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Order confirmed — #${orderNumber}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendWholesaleOrderConfirmation(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  roasterName: string;
  branding?: EmailBranding | null;
  slug?: string;
  orderId?: string;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, customerName, orderNumber, items, total, roasterName, branding, slug, orderId } = params;

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;">${item.name} &times; ${item.quantity}</td>
          <td style="padding:6px 0;color:#334155;font-size:14px;text-align:right;border-bottom:1px solid #f1f5f9;">&pound;${item.price.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Wholesale Order Confirmed</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName || "Unknown"},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Thanks for your wholesale order with <strong>${roasterName}</strong>. We&rsquo;ve received your payment and your order is now being processed.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr>
          <th style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:2px solid #e2e8f0;">Item</th>
          <th style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:2px solid #e2e8f0;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="text-align:right;margin:8px 0 24px;">
      <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0;"><strong>Total: &pound;${total.toFixed(2)}</strong></p>
    </div>

    ${emailButton({ href: slug && orderId ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/s/${slug}/orders/${orderId}` : `${process.env.NEXT_PUBLIC_PORTAL_URL}/my-orders`, label: "View Your Order", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      We&rsquo;ll send you another email when your order is dispatched.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Wholesale order confirmed — #${orderNumber}`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

// ─── Dispatch / Delivery Notifications ───

export async function sendOrderDispatchedEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  roasterName: string;
  branding?: EmailBranding | null;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, customerName, orderNumber, trackingNumber, trackingCarrier, roasterName, branding } = params;

  const trackingHtml = trackingNumber
    ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
        <p style="color:#334155;font-size:14px;margin:0 0 4px;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
        ${trackingCarrier ? `<p style="color:#334155;font-size:14px;margin:0;"><strong>Carrier:</strong> ${trackingCarrier}</p>` : ""}
      </div>`
    : "";

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Your Order Has Been Dispatched</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName || "Unknown"},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Great news &mdash; your order <strong>#${orderNumber}</strong> from <strong>${roasterName}</strong> has been dispatched and is on its way to you.
    </p>

    ${trackingHtml}

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/my-orders`, label: "Track Your Order", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions about your delivery, reply to this email.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Your order #${orderNumber} has been dispatched`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

export async function sendOrderDeliveredEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  roasterName: string;
  branding?: EmailBranding | null;
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const { to, customerName, orderNumber, roasterName, branding } = params;

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Your Order Has Been Delivered</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName || "Unknown"},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Your order <strong>#${orderNumber}</strong> from <strong>${roasterName}</strong> has been marked as delivered. We hope you enjoy your coffee!
    </p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      If there are any issues with your delivery, please don&rsquo;t hesitate to get in touch.
    </p>

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/my-orders`, label: "View Your Orders", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      Thank you for your order.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Your order #${orderNumber} has been delivered`,
    html: wrapEmailWithBranding({ body, businessName: roasterName, branding }),
  });
}

// ─── Partner Allocation Notification ───

export async function sendPartnerAllocationEmail(params: {
  to: string;
  partnerName: string;
  orderNumber: string;
  branding?: EmailBranding | null;
}) {
  const { to, partnerName, orderNumber, branding } = params;

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">New Order Allocated</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Order #${orderNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${partnerName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      A new Roastery Platform order <strong>#${orderNumber}</strong> has been allocated to you for fulfilment. Please log in to your portal to review the order details and accept it.
    </p>

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/orders`, label: "View Order", branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, reply to this email.
    </p>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New order allocated — #${orderNumber}`,
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform", branding }),
  });
}

// ─── Admin Notification for Storefront/Wholesale Orders ───

export async function sendAdminNewOrderNotification(params: {
  to: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  total: number;
  orderChannel: string;
  roasterName: string;
}) {
  const { to, customerName, customerEmail, orderNumber, total, orderChannel, roasterName } = params;

  const channelLabel = orderChannel === "wholesale" ? "Wholesale" : "Storefront";

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">New ${channelLabel} Order</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">${roasterName}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      A new ${channelLabel.toLowerCase()} order has been placed:
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Order:</strong> #${orderNumber}</p>
      <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Customer:</strong> ${customerName || "Unknown"} (${customerEmail})</p>
      <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Total:</strong> &pound;${total.toFixed(2)}</p>
      <p style="color:#334155;font-size:14px;margin:0;"><strong>Roaster:</strong> ${roasterName}</p>
    </div>

    ${emailButton({ href: `${process.env.NEXT_PUBLIC_PORTAL_URL}/admin/orders`, label: "View in Admin" })}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New ${channelLabel.toLowerCase()} order #${orderNumber} — £${total.toFixed(2)}`,
    html: wrapEmailWithBranding({ body, businessName: "Roastery Platform" }),
  });
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    GBP: "\u00a3",
    USD: "$",
    EUR: "\u20ac",
  };
  const symbol = symbols[currency.toUpperCase()] || currency + " ";
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function sendInvoiceEmail(params: {
  to: string;
  customerName: string;
  ownerName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string | null;
  accessToken: string;
  stripePaymentLinkUrl?: string | null;
  lineItems: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  branding?: EmailBranding | null;
  attachments?: { filename: string; content: Buffer }[];
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const {
    to,
    customerName,
    ownerName,
    invoiceNumber,
    total,
    currency,
    dueDate,
    accessToken,
    stripePaymentLinkUrl,
    lineItems,
    branding,
    attachments,
  } = params;

  const formattedTotal = formatCurrency(total, currency);
  const invoiceUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${accessToken}`;
  const ctaUrl = stripePaymentLinkUrl || invoiceUrl;
  const ctaLabel = stripePaymentLinkUrl ? "Pay Now" : "View Invoice";

  const lineItemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;color:#334155;font-size:14px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
        <td style="padding:8px 0;color:#334155;font-size:14px;text-align:right;border-bottom:1px solid #f1f5f9;">${formatCurrency(item.total, currency)}</td>
      </tr>`
    )
    .join("");

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Invoice ${invoiceNumber}</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">From ${ownerName}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Please find your invoice details below.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr>
          <th style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:2px solid #e2e8f0;">Description</th>
          <th style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:right;border-bottom:2px solid #e2e8f0;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div style="text-align:right;margin:16px 0 24px;">
      <p style="color:#64748b;font-size:14px;margin:0 0 4px;">Subtotal: ${formatCurrency(subtotal, currency)}</p>
      <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0;"><strong>Total: ${formattedTotal}</strong></p>
    </div>

    ${dueDate ? `<div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin:0 0 24px;text-align:center;">
      <p style="color:#334155;font-size:14px;margin:0;">Payment due by <strong>${formatDate(dueDate)}</strong></p>
    </div>` : ""}

    ${emailButton({ href: ctaUrl, label: ctaLabel, branding })}

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions about this invoice, please get in touch.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Invoice ${invoiceNumber} from ${ownerName}`,
    html: wrapEmailWithBranding({ body, businessName: ownerName, branding }),
    ...(attachments?.length ? { attachments } : {}),
  });
}

export async function sendInvoiceReminderEmail(params: {
  to: string;
  customerName: string;
  ownerName: string;
  invoiceNumber: string;
  total: number;
  amountDue: number;
  currency: string;
  dueDate: string | null;
  accessToken: string;
  stripePaymentLinkUrl?: string | null;
  branding?: EmailBranding | null;
  attachments?: { filename: string; content: Buffer }[];
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const {
    to,
    customerName,
    ownerName,
    invoiceNumber,
    total,
    amountDue,
    currency,
    dueDate,
    accessToken,
    stripePaymentLinkUrl,
    branding,
    attachments,
  } = params;

  const formattedTotal = formatCurrency(total, currency);
  const formattedAmountDue = formatCurrency(amountDue, currency);
  const invoiceUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL}/invoice/${accessToken}`;
  const ctaUrl = stripePaymentLinkUrl || invoiceUrl;
  const ctaLabel = stripePaymentLinkUrl ? "Pay Now" : "View Invoice";

  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
  const dueDateText = dueDate
    ? isOverdue
      ? `This invoice was due on <strong>${formatDate(dueDate)}</strong> and is now overdue.`
      : `Payment is due by <strong>${formatDate(dueDate)}</strong>.`
    : "";

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Payment Reminder</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Invoice ${invoiceNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      This is a friendly reminder regarding invoice <strong>${invoiceNumber}</strong> from <strong>${ownerName}</strong>.
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#334155;font-size:14px;margin:0 0 8px;"><strong>Invoice Total:</strong> ${formattedTotal}</p>
      <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 8px;"><strong>Amount Due:</strong> ${formattedAmountDue}</p>
      ${dueDateText ? `<p style="color:${isOverdue ? "#dc2626" : "#334155"};font-size:14px;margin:0;">${dueDateText}</p>` : ""}
    </div>

    ${emailButton({ href: ctaUrl, label: ctaLabel, branding })}

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      If you&rsquo;ve already made this payment, please disregard this reminder.
    </p>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions about this invoice, please get in touch.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Payment reminder: Invoice ${invoiceNumber}`,
    html: wrapEmailWithBranding({ body, businessName: ownerName, branding }),
    ...(attachments?.length ? { attachments } : {}),
  });
}

export async function sendInvoicePaymentConfirmationEmail(params: {
  to: string;
  customerName: string;
  ownerName: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  currency: string;
  branding?: EmailBranding | null;
  attachments?: { filename: string; content: Buffer }[];
  customDomain?: { domain: string; senderPrefix: string } | null;
}) {
  const {
    to,
    customerName,
    ownerName,
    invoiceNumber,
    total,
    amountPaid,
    currency,
    branding,
    attachments,
  } = params;

  const formattedTotal = formatCurrency(total, currency);
  const formattedPaid = formatCurrency(amountPaid, currency);

  const body = `
    <h1 style="color:#0f172a;font-size:24px;margin:0 0 8px;text-align:center;">Payment Received</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;text-align:center;">Invoice ${invoiceNumber}</p>

    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      Hi ${customerName},
    </p>
    <p style="color:#334155;font-size:16px;line-height:1.6;text-align:left;">
      We&rsquo;ve received your payment for invoice <strong>${invoiceNumber}</strong>. Thank you!
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;text-align:left;">
      <p style="color:#166534;font-size:14px;margin:0 0 8px;"><strong>Invoice Total:</strong> ${formattedTotal}</p>
      <p style="color:#166534;font-size:16px;font-weight:700;margin:0 0 8px;"><strong>Amount Paid:</strong> ${formattedPaid}</p>
      <p style="color:#16a34a;font-size:14px;font-weight:600;margin:0;">Status: Paid in Full</p>
    </div>

    <p style="color:#64748b;font-size:14px;line-height:1.6;text-align:left;margin-top:24px;">
      A copy of the paid invoice is attached to this email for your records.
    </p>

    <p style="color:#94a3b8;font-size:13px;margin-top:32px;text-align:center;">
      If you have any questions, please get in touch.
    </p>`;

  await resend.emails.send({
    from: getFromEmail(branding, params.customDomain),
    to,
    subject: `Payment received: Invoice ${invoiceNumber}`,
    html: wrapEmailWithBranding({ body, businessName: ownerName, branding }),
    ...(attachments?.length ? { attachments } : {}),
  });
}
