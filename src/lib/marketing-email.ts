import { Resend } from "resend";
import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailBlock } from "@/types/marketing";
import { renderEmailHtml } from "@/lib/render-email-html";
import { type TierLevel, getEffectiveLimits } from "@/lib/tier-config";

const FROM_DOMAIN = "ghostroastery.com";
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "fallback-secret";
const BATCH_SIZE = 50;

// ─── Email Rendering ───

export function renderCampaignEmail(
  content: unknown[],
  businessName: string,
  roasterId: string,
  emailBgColor?: string
): string {
  const blocks = content as EmailBlock[];
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.ghostroastery.com"}/api/marketing/unsubscribe?token={{unsubscribe_token}}`;
  return renderEmailHtml(blocks, businessName, unsubscribeUrl, emailBgColor || undefined);
}

// ─── Unsubscribe Tokens ───

export function generateUnsubscribeToken(roasterId: string, email: string): string {
  const payload = JSON.stringify({ roasterId, email, ts: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): { roasterId: string; email: string } | null {
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expected = createHmac("sha256", UNSUBSCRIBE_SECRET)
      .update(encoded)
      .digest("base64url");

    if (signature !== expected) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

    // Token valid for 90 days
    if (Date.now() - payload.ts > 90 * 24 * 60 * 60 * 1000) return null;

    return { roasterId: payload.roasterId, email: payload.email };
  } catch {
    return null;
  }
}

// ─── Email Limits ───

export async function checkEmailLimits(
  roasterId: string,
  recipientCount: number,
  supabase: SupabaseClient
): Promise<{ allowed: boolean; message?: string }> {
  const { data: roaster } = await supabase
    .from("partner_roasters")
    .select("monthly_emails_sent, monthly_email_reset_at, marketing_tier")
    .eq("id", roasterId)
    .single();

  if (!roaster) return { allowed: false, message: "Roaster not found" };

  // Get tier-based email limit
  const marketingTier = (roaster.marketing_tier as TierLevel) || "free";
  const limits = getEffectiveLimits("free", marketingTier);
  const emailLimit = limits.emailSendsPerMonth;

  let currentCount = (roaster.monthly_emails_sent as number) || 0;
  const resetAt = roaster.monthly_email_reset_at as string | null;

  // Reset monthly counter if it's a new month
  if (resetAt) {
    const resetDate = new Date(resetAt);
    const now = new Date();
    if (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
      currentCount = 0;
      await supabase
        .from("partner_roasters")
        .update({ monthly_emails_sent: 0, monthly_email_reset_at: now.toISOString() })
        .eq("id", roasterId);
    }
  } else {
    // First time — set reset date
    await supabase
      .from("partner_roasters")
      .update({ monthly_email_reset_at: new Date().toISOString() })
      .eq("id", roasterId);
  }

  if (emailLimit !== Infinity && currentCount + recipientCount > emailLimit) {
    const remaining = Math.max(0, emailLimit - currentCount);
    return {
      allowed: false,
      message: `Monthly email limit reached (${currentCount}/${emailLimit === Infinity ? "Unlimited" : emailLimit}). You can send ${remaining} more emails this month. Upgrade your Marketing Suite plan for a higher limit.`,
    };
  }

  return { allowed: true };
}

// ─── Batch Sending ───

interface SendBatchParams {
  campaignId: string;
  roasterId: string;
  recipients: { contactId: string; email: string; name?: string }[];
  subject: string;
  previewText?: string;
  html: string;
  fromName: string;
  replyTo: string;
  supabase: SupabaseClient;
  customDomain?: { domain: string; senderPrefix: string } | null;
}

export async function sendCampaignBatch(params: SendBatchParams): Promise<void> {
  const { campaignId, recipients, subject, html, fromName, replyTo, supabase } = params;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const domain = params.customDomain?.domain || FROM_DOMAIN;
  const prefix = params.customDomain?.senderPrefix || "noreply";
  const fromEmail = `${fromName} <${prefix}@${domain}>`;

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const sendPromises = batch.map(async (recipient) => {
      try {
        // Generate personalized unsubscribe token
        const token = generateUnsubscribeToken(
          params.roasterId,
          recipient.email
        );
        const personalizedHtml = html.replace("{{unsubscribe_token}}", token);

        const result = await resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject,
          html: personalizedHtml,
          replyTo,
          headers: {
            "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.ghostroastery.com"}/api/marketing/unsubscribe?token=${token}>`,
          },
        });

        // Update recipient record
        await supabase
          .from("campaign_recipients")
          .update({
            status: "sent",
            resend_id: result.data?.id || null,
            sent_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaignId)
          .eq("email", recipient.email);
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        await supabase
          .from("campaign_recipients")
          .update({ status: "failed" })
          .eq("campaign_id", campaignId)
          .eq("email", recipient.email);
      }
    });

    await Promise.all(sendPromises);

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
