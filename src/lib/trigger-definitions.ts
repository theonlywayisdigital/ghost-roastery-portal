import type { TriggerDefinition, FilterOperator } from "@/types/marketing";

const textOps: FilterOperator[] = ["equals", "not_equals", "contains", "not_contains", "is_set", "is_not_set"];
const numOps: FilterOperator[] = ["equals", "not_equals", "greater_than", "less_than", "is_set", "is_not_set"];
const selectOps: FilterOperator[] = ["equals", "not_equals", "in", "not_in", "is_set", "is_not_set"];

/** Contact-level filter fields available on most triggers */
const CONTACT_FILTERS = [
  { key: "contact.types", label: "Contact Type", type: "multiselect" as const, operators: selectOps, dynamicOptionsKey: "contact_types" },
  { key: "contact.status", label: "Contact Status", type: "select" as const, operators: selectOps, options: [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }] },
  { key: "contact.source", label: "Source", type: "select" as const, operators: selectOps, dynamicOptionsKey: "contact_sources" },
  { key: "contact.total_spend", label: "Total Spend", type: "number" as const, operators: numOps },
  { key: "contact.order_count", label: "Order Count", type: "number" as const, operators: numOps },
  { key: "contact.email", label: "Email", type: "text" as const, operators: textOps },
  { key: "contact.business_name", label: "Business Name", type: "text" as const, operators: textOps },
];

export const TRIGGER_DEFINITIONS: TriggerDefinition[] = [
  // ── Event Triggers ──────────────────────────────────
  {
    type: "form_submitted",
    label: "Form Submitted",
    description: "When a contact submits a specific form",
    icon: "FileText",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    category: "event",
    configFields: [
      { key: "form_id", label: "Form", type: "select", placeholder: "Any form", dynamicOptionsKey: "forms" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "contact_created",
    label: "Contact Created",
    description: "When a new contact is added",
    icon: "UserPlus",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    category: "event",
    configFields: [
      { key: "source", label: "Source", type: "select", placeholder: "Any source", dynamicOptionsKey: "contact_sources" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "business_type_changed",
    label: "Business Type Changed",
    description: "When a business type is updated",
    icon: "Building",
    color: "text-blue-600",
    bg: "bg-blue-50",
    category: "event",
    configFields: [
      { key: "new_type", label: "New Type", type: "select", placeholder: "Any type", dynamicOptionsKey: "business_types" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "contact_type_changed",
    label: "Contact Type Changed",
    description: "When a contact's types are updated",
    icon: "UserCog",
    color: "text-teal-600",
    bg: "bg-teal-50",
    category: "event",
    configFields: [
      { key: "new_type", label: "New Type", type: "select", placeholder: "Any type", dynamicOptionsKey: "contact_types" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "pipeline_stage_changed",
    label: "Pipeline Stage Changed",
    description: "When a contact or business is moved to a new pipeline stage",
    icon: "GitBranch",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    category: "event",
    configFields: [
      { key: "stage", label: "Stage", type: "select", placeholder: "Any stage", dynamicOptionsKey: "pipeline_stages" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "business_created",
    label: "Business Created",
    description: "When a new business is added",
    icon: "Building2",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "order_placed",
    label: "Order Placed",
    description: "When a wholesale order is placed",
    icon: "ShoppingCart",
    color: "text-green-600",
    bg: "bg-green-50",
    category: "event",
    filterFields: [
      ...CONTACT_FILTERS,
      { key: "order.subtotal", label: "Order Value", type: "number" as const, operators: numOps },
    ],
  },
  {
    type: "order_status_changed",
    label: "Order Status Changed",
    description: "When an order status is updated",
    icon: "PackageCheck",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    category: "event",
    configFields: [
      { key: "new_status", label: "New Status", type: "select", placeholder: "Any status", options: [
        { value: "confirmed", label: "Confirmed" },
        { value: "dispatched", label: "Dispatched" },
        { value: "delivered", label: "Delivered" },
        { value: "cancelled", label: "Cancelled" },
      ]},
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "discount_code_redeemed",
    label: "Discount Code Redeemed",
    description: "When a discount code is used",
    icon: "Ticket",
    color: "text-orange-600",
    bg: "bg-orange-50",
    category: "event",
    configFields: [
      { key: "discount_code_id", label: "Discount Code", type: "select", placeholder: "Any code", dynamicOptionsKey: "discount_codes" },
    ],
    filterFields: CONTACT_FILTERS,
  },

  // ── Engagement Triggers ──────────────────────────────
  {
    type: "email_engagement",
    label: "Email Engagement",
    description: "When a contact opens or clicks a campaign email",
    icon: "MailOpen",
    color: "text-violet-600",
    bg: "bg-violet-50",
    category: "engagement",
    configFields: [
      { key: "engagement_type", label: "Engagement", type: "select", options: [
        { value: "opened", label: "Opened" },
        { value: "clicked", label: "Clicked" },
      ]},
      { key: "campaign_id", label: "Campaign", type: "select", placeholder: "Any campaign", dynamicOptionsKey: "campaigns" },
    ],
    filterFields: CONTACT_FILTERS,
  },

  // ── Time-Based Triggers ──────────────────────────────
  {
    type: "no_activity",
    label: "No Activity",
    description: "When a contact has been inactive for a period",
    icon: "Clock",
    color: "text-amber-600",
    bg: "bg-amber-50",
    category: "time",
    configFields: [
      { key: "days_inactive", label: "Days Inactive", type: "number", placeholder: "30" },
    ],
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "date_based",
    label: "Date-Based",
    description: "Trigger on a date field (e.g. birthday, anniversary)",
    icon: "Calendar",
    color: "text-pink-600",
    bg: "bg-pink-50",
    category: "time",
    configFields: [
      { key: "date_field", label: "Date Field", type: "select", options: [
        { value: "birthday", label: "Birthday" },
        { value: "created_at", label: "Contact Created Date" },
      ]},
      { key: "days_before", label: "Days Before", type: "number", placeholder: "0" },
    ],
    filterFields: CONTACT_FILTERS,
  },

  // ── Custom Triggers ──────────────────────────────────
  {
    type: "custom_webhook",
    label: "Custom Webhook",
    description: "Trigger via external webhook URL",
    icon: "Webhook",
    color: "text-slate-600",
    bg: "bg-slate-100",
    category: "custom",
    filterFields: CONTACT_FILTERS,
  },

  // ── Legacy triggers (kept for backwards compatibility) ──
  {
    type: "new_customer",
    label: "New Customer",
    description: "When a new customer is created",
    icon: "UserPlus",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "post_purchase",
    label: "Post-Purchase",
    description: "After an order is completed",
    icon: "ShoppingCart",
    color: "text-blue-600",
    bg: "bg-blue-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "review_request",
    label: "Review Request",
    description: "Request a review after purchase",
    icon: "Star",
    color: "text-amber-600",
    bg: "bg-amber-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "win_back",
    label: "Win-Back",
    description: "Re-engage inactive customers",
    icon: "RefreshCw",
    color: "text-purple-600",
    bg: "bg-purple-50",
    category: "time",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "abandoned_cart",
    label: "Abandoned Cart",
    description: "Cart was abandoned",
    icon: "ShoppingCart",
    color: "text-red-600",
    bg: "bg-red-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "wholesale_approved",
    label: "Wholesale Approved",
    description: "Wholesale application approved",
    icon: "Building",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    category: "event",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "birthday",
    label: "Birthday",
    description: "On contact's birthday",
    icon: "Gift",
    color: "text-pink-600",
    bg: "bg-pink-50",
    category: "time",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "re_engagement",
    label: "Re-engagement",
    description: "Re-engage inactive contacts",
    icon: "Mail",
    color: "text-orange-600",
    bg: "bg-orange-50",
    category: "engagement",
    filterFields: CONTACT_FILTERS,
  },
  {
    type: "custom",
    label: "Custom Trigger",
    description: "Manual or API-triggered",
    icon: "Zap",
    color: "text-slate-600",
    bg: "bg-slate-100",
    category: "custom",
    filterFields: CONTACT_FILTERS,
  },
];

export function getTriggerDefinition(type: string): TriggerDefinition | undefined {
  return TRIGGER_DEFINITIONS.find((d) => d.type === type);
}

/** Get definitions grouped by category */
export function getTriggersByCategory() {
  const categories: Record<string, TriggerDefinition[]> = {
    event: [],
    time: [],
    engagement: [],
    custom: [],
  };
  for (const def of TRIGGER_DEFINITIONS) {
    categories[def.category].push(def);
  }
  return categories;
}

/** Deduplicated list — prefer new triggers over legacy ones */
export function getPrimaryTriggers(): TriggerDefinition[] {
  const newTriggerTypes = new Set([
    "form_submitted", "contact_created",
    "business_type_changed", "contact_type_changed", "pipeline_stage_changed", "business_created",
    "order_placed", "order_status_changed", "discount_code_redeemed",
    "email_engagement", "no_activity", "date_based", "custom_webhook",
  ]);
  // Show new triggers + legacy triggers that don't overlap
  return TRIGGER_DEFINITIONS.filter((d) => newTriggerTypes.has(d.type));
}
