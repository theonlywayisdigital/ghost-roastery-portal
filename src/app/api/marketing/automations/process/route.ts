import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { renderCampaignEmail, checkEmailLimits } from "@/lib/marketing-email";
import { fireAutomationTrigger, evaluateFilters } from "@/lib/automation-triggers";
import { getVerifiedDomain } from "@/lib/email";
import type { TriggerFilters } from "@/types/marketing";
import { Resend } from "resend";

const FROM_DOMAIN = "roasteryplatform.com";

/** Increment completed_count on the automation row (mirrors enrolled_count pattern) */
async function incrementCompletedCount(
  supabase: ReturnType<typeof createServerClient>,
  automationId: string
) {
  const { data: current } = await supabase
    .from("automations")
    .select("completed_count")
    .eq("id", automationId)
    .single();

  if (current) {
    await supabase
      .from("automations")
      .update({ completed_count: (current.completed_count || 0) + 1 })
      .eq("id", automationId);
  }
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (GET with Bearer CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  let processed = 0;
  let sent = 0;
  const triggerEnrolled = 0;

  try {
    // ── Process time-based triggers (no_activity, date_based) ──
    await processTimeTriggers(supabase);

    // Find active enrollments that are due for their next step
    const { data: dueEnrollments } = await supabase
      .from("automation_enrollments")
      .select("*, automations(*, partner_roasters(id, business_name, email, brand_logo_url, brand_accent_colour))")
      .eq("status", "active")
      .lte("next_step_at", new Date().toISOString())
      .limit(100);

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, message: "No enrollments to process" });
    }

    for (const enrollment of dueEnrollments) {
      const automation = enrollment.automations as Record<string, unknown>;
      if (!automation || (automation.status as string) !== "active") {
        continue; // Skip paused/draft automations
      }

      const roaster = automation.partner_roasters as Record<string, unknown>;
      if (!roaster) continue;

      // Get steps for this automation
      const { data: steps } = await supabase
        .from("automation_steps")
        .select("*")
        .eq("automation_id", enrollment.automation_id)
        .order("step_order", { ascending: true });

      if (!steps || steps.length === 0) continue;

      const currentStepOrder = enrollment.current_step;
      const step = steps.find((s: { step_order: number }) => s.step_order === currentStepOrder);

      if (!step) {
        // No more steps — mark as completed
        await supabase
          .from("automation_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        await incrementCompletedCount(supabase, enrollment.automation_id);
        processed++;
        continue;
      }

      const config = step.config as Record<string, unknown>;

      switch (step.step_type) {
        case "email": {
          // Check email limits
          const limitCheck = await checkEmailLimits(roaster.id as string, 1, supabase);
          if (!limitCheck.allowed) {
            continue; // Skip, try again next cycle
          }

          // Get contact email
          const { data: contact } = await supabase
            .from("contacts")
            .select("email, first_name, last_name, unsubscribed")
            .eq("id", enrollment.contact_id)
            .single();

          if (!contact || !contact.email || contact.unsubscribed) {
            await supabase
              .from("automation_enrollments")
              .update({ status: "cancelled" })
              .eq("id", enrollment.id);
            processed++;
            continue;
          }

          const content = (config.content as unknown[]) || [];
          const html = renderCampaignEmail(
            content,
            roaster.business_name as string,
            roaster.id as string,
            undefined,
            (roaster.brand_logo_url as string) || null,
            (roaster.brand_accent_colour as string) || null
          );

          const fromName = (config.from_name as string) || (roaster.business_name as string);
          const subject = (config.subject as string) || "Message from " + (roaster.business_name as string);

          // Look up custom domain for this roaster
          const customDomain = await getVerifiedDomain(roaster.id as string);
          const emailDomain = customDomain?.domain || FROM_DOMAIN;
          const emailPrefix = customDomain?.senderPrefix || "noreply";

          try {
            const sendResult = await resend.emails.send({
              from: `${fromName} <${emailPrefix}@${emailDomain}>`,
              to: contact.email,
              subject,
              html,
            });

            // Log with resend_id so webhooks can update open/click status
            await supabase.from("automation_step_logs").insert({
              enrollment_id: enrollment.id,
              step_id: step.id,
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_id: sendResult.data?.id || null,
            });

            sent++;
          } catch (e) {
            console.error("Automation send error:", e);
            await supabase.from("automation_step_logs").insert({
              enrollment_id: enrollment.id,
              step_id: step.id,
              status: "bounced",
            });
          }

          // Advance to next step
          const nextStep = steps.find((s: { step_order: number }) => s.step_order === currentStepOrder + 1);
          if (nextStep) {
            await supabase
              .from("automation_enrollments")
              .update({
                current_step: currentStepOrder + 1,
                next_step_at: new Date().toISOString(),
              })
              .eq("id", enrollment.id);
          } else {
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", enrollment.id);
            await incrementCompletedCount(supabase, enrollment.automation_id);
          }
          break;
        }

        case "delay": {
          const delayDays = (config.delay_days as number) || 0;
          const delayHours = (config.delay_hours as number) || 0;
          const delayMinutes = (config.delay_minutes as number) || 0;
          const nextStepAt = new Date();
          nextStepAt.setDate(nextStepAt.getDate() + delayDays);
          nextStepAt.setHours(nextStepAt.getHours() + delayHours);
          nextStepAt.setMinutes(nextStepAt.getMinutes() + delayMinutes);

          const nextStep = steps.find((s: { step_order: number }) => s.step_order === currentStepOrder + 1);
          if (nextStep) {
            await supabase
              .from("automation_enrollments")
              .update({
                current_step: currentStepOrder + 1,
                next_step_at: nextStepAt.toISOString(),
              })
              .eq("id", enrollment.id);
          } else {
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", enrollment.id);
            await incrementCompletedCount(supabase, enrollment.automation_id);
          }
          break;
        }

        case "condition": {
          let conditionMet = false;
          const field = config.field as string;

          if (field === "opened_previous" || field === "clicked_previous") {
            // Check if previous email step was opened/clicked
            const prevEmailSteps = steps.filter(
              (s: { step_order: number; step_type: string }) =>
                s.step_order < currentStepOrder && s.step_type === "email"
            );
            const lastEmailStep = prevEmailSteps[prevEmailSteps.length - 1];

            if (lastEmailStep) {
              const { data: log } = await supabase
                .from("automation_step_logs")
                .select("status")
                .eq("enrollment_id", enrollment.id)
                .eq("step_id", lastEmailStep.id)
                .single();

              const checkStatus = field === "opened_previous" ? "opened" : "clicked";
              const wasActioned = log?.status === checkStatus || log?.status === "clicked";
              const expectedValue = config.value as boolean;
              conditionMet = expectedValue ? wasActioned : !wasActioned;
            }
          } else if (field === "contact_type_is") {
            // Check if contact's type matches expected value
            const { data: contact } = await supabase
              .from("contacts")
              .select("contact_type")
              .eq("id", enrollment.contact_id)
              .single();
            conditionMet = contact?.contact_type === (config.value as string);
          } else if (field === "has_placed_order") {
            // Check if contact has placed an order since enrolment
            const { data: orders } = await supabase
              .from("orders")
              .select("id")
              .eq("contact_id", enrollment.contact_id)
              .gte("created_at", enrollment.enrolled_at as string)
              .limit(1);
            const hasOrdered = !!(orders && orders.length > 0);
            const expectedValue = config.value as boolean;
            conditionMet = expectedValue ? hasOrdered : !hasOrdered;
          } else if (field === "pipeline_stage_is") {
            // Check if contact's pipeline stage matches expected value
            const { data: contact } = await supabase
              .from("contacts")
              .select("pipeline_stage")
              .eq("id", enrollment.contact_id)
              .single();
            conditionMet = contact?.pipeline_stage === (config.value as string);
          }

          if (conditionMet) {
            // Advance to next step
            const nextStep = steps.find((s: { step_order: number }) => s.step_order === currentStepOrder + 1);
            if (nextStep) {
              await supabase
                .from("automation_enrollments")
                .update({ current_step: currentStepOrder + 1, next_step_at: new Date().toISOString() })
                .eq("id", enrollment.id);
            } else {
              await supabase
                .from("automation_enrollments")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", enrollment.id);
              await incrementCompletedCount(supabase, enrollment.automation_id);
            }
          } else {
            // Execute no-path action if configured
            const noAction = config.no_action as string | undefined;
            if (noAction === "change_contact_type" && config.no_action_value) {
              await supabase
                .from("contacts")
                .update({ contact_type: config.no_action_value as string })
                .eq("id", enrollment.contact_id);
            } else if (noAction === "change_pipeline_stage" && config.no_action_value) {
              await supabase
                .from("contacts")
                .update({ pipeline_stage: config.no_action_value as string })
                .eq("id", enrollment.contact_id);
            }

            // End automation for this contact
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", enrollment.id);
            await incrementCompletedCount(supabase, enrollment.automation_id);
          }

          await supabase.from("automation_step_logs").insert({
            enrollment_id: enrollment.id,
            step_id: step.id,
            status: conditionMet ? "sent" : "skipped",
          });
          break;
        }
      }

      processed++;
    }
  } catch (error) {
    console.error("Automation process error:", error);
    return NextResponse.json({ error: "Processing failed", processed, sent }, { status: 500 });
  }

  return NextResponse.json({ processed, sent, triggerEnrolled, message: "OK" });
}

// ═══════════════════════════════════════════════════════════
// Time-based trigger processing (no_activity, date_based)
// ═══════════════════════════════════════════════════════════

async function processTimeTriggers(supabase: ReturnType<typeof createServerClient>) {
  const now = new Date();

  // Find active automations with time-based triggers
  const { data: timeAutomations } = await supabase
    .from("automations")
    .select("id, roaster_id, trigger_type, trigger_config, trigger_filters, last_trigger_check_at")
    .eq("status", "active")
    .in("trigger_type", ["no_activity", "date_based"]);

  if (!timeAutomations || timeAutomations.length === 0) return;

  for (const automation of timeAutomations) {
    // Only check once per hour to avoid spamming
    if (automation.last_trigger_check_at) {
      const lastCheck = new Date(automation.last_trigger_check_at);
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (lastCheck > hourAgo) continue;
    }

    const config = (automation.trigger_config as Record<string, unknown>) || {};
    const filters = automation.trigger_filters as TriggerFilters | null;

    if (automation.trigger_type === "no_activity") {
      await processNoActivityTrigger(supabase, automation.id, automation.roaster_id as string, config, filters, now);
    } else if (automation.trigger_type === "date_based") {
      await processDateBasedTrigger(supabase, automation.id, automation.roaster_id as string, config, filters, now);
    }

    // Update last check timestamp
    await supabase
      .from("automations")
      .update({ last_trigger_check_at: now.toISOString() })
      .eq("id", automation.id);
  }
}

async function processNoActivityTrigger(
  supabase: ReturnType<typeof createServerClient>,
  automationId: string,
  roasterId: string,
  config: Record<string, unknown>,
  filters: TriggerFilters | null,
  now: Date
) {
  const daysInactive = (config.days_inactive as number) || 30;
  const cutoff = new Date(now.getTime() - daysInactive * 24 * 60 * 60 * 1000);

  // Find contacts inactive since cutoff
  const { data: inactiveContacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("roaster_id", roasterId)
    .eq("status", "active")
    .eq("unsubscribed", false)
    .lt("last_activity_at", cutoff.toISOString())
    .limit(50);

  if (!inactiveContacts || inactiveContacts.length === 0) return;

  for (const contact of inactiveContacts) {
    // Evaluate filters
    if (!evaluateFilters({ contact }, filters)) continue;

    // Check not already enrolled
    const { data: existing } = await supabase
      .from("automation_enrollments")
      .select("id")
      .eq("automation_id", automationId)
      .eq("contact_id", contact.id)
      .in("status", ["active", "completed"])
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Enroll via the standard trigger mechanism
    await fireAutomationTrigger({
      trigger_type: "no_activity",
      roaster_id: roasterId,
      contact_id: contact.id,
      context: { contact },
    });
  }
}

async function processDateBasedTrigger(
  supabase: ReturnType<typeof createServerClient>,
  automationId: string,
  roasterId: string,
  config: Record<string, unknown>,
  filters: TriggerFilters | null,
  now: Date
) {
  const dateField = (config.date_field as string) || "birthday";
  const daysBefore = (config.days_before as number) || 0;

  // Calculate target date
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysBefore);

  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();

  if (dateField === "birthday") {
    // Find contacts whose birthday matches today's month/day
    // Birthday is stored as a date column
    const { data: contacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("roaster_id", roasterId)
      .eq("status", "active")
      .eq("unsubscribed", false)
      .not("birthday", "is", null)
      .limit(200);

    if (!contacts || contacts.length === 0) return;

    for (const contact of contacts) {
      if (!contact.birthday) continue;
      const bday = new Date(contact.birthday as string);
      if (bday.getMonth() + 1 !== month || bday.getDate() !== day) continue;

      // Evaluate filters
      if (!evaluateFilters({ contact }, filters)) continue;

      // Check not already enrolled this year
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const { data: existing } = await supabase
        .from("automation_enrollments")
        .select("id")
        .eq("automation_id", automationId)
        .eq("contact_id", contact.id)
        .gte("enrolled_at", yearStart)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await fireAutomationTrigger({
        trigger_type: "date_based",
        roaster_id: roasterId,
        contact_id: contact.id,
        context: { contact },
      });
    }
  } else if (dateField === "created_at") {
    // Anniversary of contact creation — same month/day different year
    const { data: contacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("roaster_id", roasterId)
      .eq("status", "active")
      .eq("unsubscribed", false)
      .limit(200);

    if (!contacts || contacts.length === 0) return;

    for (const contact of contacts) {
      const created = new Date(contact.created_at as string);
      if (created.getMonth() + 1 !== month || created.getDate() !== day) continue;
      // Don't trigger on the actual creation date (same year)
      if (created.getFullYear() === now.getFullYear()) continue;

      if (!evaluateFilters({ contact }, filters)) continue;

      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const { data: existing } = await supabase
        .from("automation_enrollments")
        .select("id")
        .eq("automation_id", automationId)
        .eq("contact_id", contact.id)
        .gte("enrolled_at", yearStart)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await fireAutomationTrigger({
        trigger_type: "date_based",
        roaster_id: roasterId,
        contact_id: contact.id,
        context: { contact },
      });
    }
  }
}
