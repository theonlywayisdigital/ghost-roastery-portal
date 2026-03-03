import { createServerClient } from "@/lib/supabase";
import type {
  TriggerType,
  TriggerFilters,
  FilterGroup,
  FilterCondition,
  FilterOperator,
} from "@/types/marketing";

// ═══════════════════════════════════════════════════════════
// Filter evaluation
// ═══════════════════════════════════════════════════════════

/**
 * Resolve a dotted field path from a context object.
 * e.g. "contact.types" from { contact: { types: ["customer"] } }
 */
function resolveField(context: Record<string, unknown>, field: string): unknown {
  const parts = field.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateOperator(fieldValue: unknown, operator: FilterOperator, conditionValue: unknown): boolean {
  switch (operator) {
    case "is_set":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";

    case "is_not_set":
      return fieldValue === null || fieldValue === undefined || fieldValue === "";

    case "equals":
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue);
      }
      return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();

    case "not_equals":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(conditionValue);
      }
      return String(fieldValue).toLowerCase() !== String(conditionValue).toLowerCase();

    case "contains":
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((v) => String(v).toLowerCase().includes(String(conditionValue).toLowerCase()));
      }
      return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());

    case "not_contains":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some((v) => String(v).toLowerCase().includes(String(conditionValue).toLowerCase()));
      }
      return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());

    case "greater_than":
      return Number(fieldValue) > Number(conditionValue);

    case "less_than":
      return Number(fieldValue) < Number(conditionValue);

    case "in": {
      const list = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
      if (Array.isArray(fieldValue)) {
        return list.some((v) => fieldValue.includes(v));
      }
      return list.map((v) => String(v).toLowerCase()).includes(String(fieldValue).toLowerCase());
    }

    case "not_in": {
      const list = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
      if (Array.isArray(fieldValue)) {
        return !list.some((v) => fieldValue.includes(v));
      }
      return !list.map((v) => String(v).toLowerCase()).includes(String(fieldValue).toLowerCase());
    }

    default:
      return true;
  }
}

function evaluateCondition(context: Record<string, unknown>, condition: FilterCondition): boolean {
  const fieldValue = resolveField(context, condition.field);
  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

/** Within a group, conditions are OR'd */
function evaluateGroup(context: Record<string, unknown>, group: FilterGroup): boolean {
  if (group.conditions.length === 0) return true;
  return group.conditions.some((condition) => evaluateCondition(context, condition));
}

/** Groups are AND'd together */
export function evaluateFilters(context: Record<string, unknown>, filters: TriggerFilters | null): boolean {
  if (!filters || !filters.groups || filters.groups.length === 0) return true;
  return filters.groups.every((group) => evaluateGroup(context, group));
}

// ═══════════════════════════════════════════════════════════
// Trigger + Enroll
// ═══════════════════════════════════════════════════════════

interface TriggerEvent {
  trigger_type: TriggerType;
  roaster_id: string;
  contact_id: string;
  /** Extra context for filter evaluation (e.g. order data, form data) */
  context?: Record<string, unknown>;
  /** Event-specific data for config matching (e.g. form_id, new_status) */
  event_data?: Record<string, unknown>;
}

/**
 * Check if an automation's trigger_config matches the event data.
 * For example, if automation config has form_id = "abc", the event must have form_id = "abc".
 * Empty/null config values mean "any".
 */
function matchesTriggerConfig(
  automationConfig: Record<string, unknown>,
  eventData: Record<string, unknown>
): boolean {
  for (const [key, configValue] of Object.entries(automationConfig)) {
    if (configValue === null || configValue === undefined || configValue === "") continue;
    const eventValue = eventData[key];
    if (eventValue === undefined) continue;
    if (String(configValue) !== String(eventValue)) return false;
  }
  return true;
}

/**
 * Fire a trigger event: find matching active automations, evaluate filters, and enroll.
 * This is the main entry point called from API hooks.
 */
export async function fireAutomationTrigger(event: TriggerEvent): Promise<{ enrolled: number }> {
  const supabase = createServerClient();
  let enrolled = 0;

  try {
    // Find active automations matching this trigger type for this roaster
    const { data: automations } = await supabase
      .from("automations")
      .select("id, trigger_config, trigger_filters")
      .eq("roaster_id", event.roaster_id)
      .eq("trigger_type", event.trigger_type)
      .eq("status", "active");

    if (!automations || automations.length === 0) return { enrolled: 0 };

    // Build filter context — fetch contact data if not provided
    let context = event.context || {};
    if (!context.contact && event.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", event.contact_id)
        .single();
      if (contact) {
        context = { ...context, contact };
      }
    }

    for (const automation of automations) {
      const triggerConfig = (automation.trigger_config as Record<string, unknown>) || {};
      const triggerFilters = automation.trigger_filters as TriggerFilters | null;

      // 1. Check trigger config matches event data
      if (event.event_data && !matchesTriggerConfig(triggerConfig, event.event_data)) {
        continue;
      }

      // 2. Evaluate filters against contact + event context
      if (!evaluateFilters(context, triggerFilters)) {
        continue;
      }

      // 3. Check not already enrolled
      const { data: existing } = await supabase
        .from("automation_enrollments")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("contact_id", event.contact_id)
        .eq("status", "active")
        .limit(1);

      if (existing && existing.length > 0) continue;

      // 4. Get first step
      const { data: firstStep } = await supabase
        .from("automation_steps")
        .select("step_order")
        .eq("automation_id", automation.id)
        .order("step_order", { ascending: true })
        .limit(1);

      const firstStepOrder = firstStep?.[0]?.step_order ?? 1;

      // 5. Enroll
      const { error } = await supabase.from("automation_enrollments").insert({
        automation_id: automation.id,
        contact_id: event.contact_id,
        current_step: firstStepOrder,
        status: "active",
        next_step_at: new Date().toISOString(),
      });

      if (!error) {
        enrolled++;

        // Increment enrolled count
        const { data: current } = await supabase
          .from("automations")
          .select("enrolled_count")
          .eq("id", automation.id)
          .single();

        if (current) {
          await supabase
            .from("automations")
            .update({ enrolled_count: (current.enrolled_count || 0) + 1 })
            .eq("id", automation.id);
        }
      }
    }
  } catch (error) {
    console.error("fireAutomationTrigger error:", error);
  }

  return { enrolled };
}

/**
 * Update a contact's last_activity_at timestamp.
 * Called from various hooks after meaningful contact interactions.
 */
export async function updateContactActivity(contactId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("contacts")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", contactId);
}
