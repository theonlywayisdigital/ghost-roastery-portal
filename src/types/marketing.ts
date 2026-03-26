// ═══════════════════════════════════════════════════════════
// Content Calendar
// ═══════════════════════════════════════════════════════════

export type CalendarChannel = "campaign" | "social" | "automation" | "discount";

export interface CalendarItem {
  id: string;
  channel: CalendarChannel;
  title: string;
  subtitle?: string;
  date: string;        // ISO date
  time?: string;       // HH:mm
  status: string;
  link: string;        // URL to navigate to
}

// ═══════════════════════════════════════════════════════════
// Email Block Types (campaign content builder)
// ═══════════════════════════════════════════════════════════

export type EmailBlockType =
  | "header"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "social"
  | "footer"
  | "product_grid"
  | "spacer"
  | "discount_code";

export interface EmailBlockBase {
  id: string;
  type: EmailBlockType;
}

export interface HeaderBlockData {
  text: string;
  level: 1 | 2 | 3;
  align: "left" | "center" | "right";
  color?: string;
}

export interface TextBlockData {
  html: string;
  align?: "left" | "center" | "right";
}

export interface ImageBlockData {
  src: string;
  alt: string;
  align: "left" | "center" | "right";
  linkUrl?: string;
  width?: "auto" | "full" | number;
  borderRadius?: number;
}

export interface ButtonBlockData {
  text: string;
  url: string;
  align: "left" | "center" | "right";
  style: "filled" | "outline";
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
}

export interface DividerBlockData {
  color?: string;
  thickness?: number;
  width?: "full" | "half" | "third";
}

export interface SpacerBlockData {
  height: number;
}

export interface SocialBlockData {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;
  align?: "left" | "center" | "right";
}

export interface FooterBlockData {
  text: string;
  align?: "left" | "center" | "right";
}

export interface ProductGridBlockData {
  productIds: string[];
  columns: 1 | 2 | 3;
}

export interface DiscountCodeBlockData {
  code: string;
  description: string;
  style: "banner" | "card" | "minimal";
  backgroundColor?: string;
  textColor?: string;
}

export type EmailBlock =
  | (EmailBlockBase & { type: "header"; data: HeaderBlockData })
  | (EmailBlockBase & { type: "text"; data: TextBlockData })
  | (EmailBlockBase & { type: "image"; data: ImageBlockData })
  | (EmailBlockBase & { type: "button"; data: ButtonBlockData })
  | (EmailBlockBase & { type: "divider"; data: DividerBlockData })
  | (EmailBlockBase & { type: "social"; data: SocialBlockData })
  | (EmailBlockBase & { type: "footer"; data: FooterBlockData })
  | (EmailBlockBase & { type: "product_grid"; data: ProductGridBlockData })
  | (EmailBlockBase & { type: "spacer"; data: SpacerBlockData })
  | (EmailBlockBase & { type: "discount_code"; data: DiscountCodeBlockData });

// ═══════════════════════════════════════════════════════════
// Email Templates
// ═══════════════════════════════════════════════════════════

export type TemplateCategory =
  | "welcome"
  | "product_launch"
  | "newsletter"
  | "promotion"
  | "event"
  | "flash_sale"
  | "thank_you"
  | "re_engagement"
  | "general";

export interface EmailTemplate {
  id: string;
  roaster_id: string | null;
  name: string;
  description: string | null;
  category: TemplateCategory;
  content: EmailBlock[];
  email_bg_color: string | null;
  thumbnail_url: string | null;
  is_prebuilt: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Campaigns
// ═══════════════════════════════════════════════════════════

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type AudienceType = "all" | "customers" | "wholesale" | "suppliers" | "leads" | "custom";

export interface Campaign {
  id: string;
  roaster_id: string;
  name: string;
  subject: string | null;
  preview_text: string | null;
  from_name: string | null;
  reply_to: string | null;
  content: EmailBlock[];
  email_bg_color: string | null;
  template_id: string | null;
  audience_type: AudienceType;
  audience_filter: Record<string, unknown>;
  recipient_count: number;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Campaign Recipients
// ═══════════════════════════════════════════════════════════

export type RecipientStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed";

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  email: string;
  status: RecipientStatus;
  resend_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// Campaign Links
// ═══════════════════════════════════════════════════════════

export interface CampaignLink {
  id: string;
  campaign_id: string;
  url: string;
  click_count: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════════

export interface CampaignsListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  counts: {
    all: number;
    draft: number;
    scheduled: number;
    sent: number;
  };
}

export interface CampaignReportStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

export interface CampaignReportResponse {
  campaign: Campaign;
  stats: CampaignReportStats;
  recipients: CampaignRecipient[];
  links: CampaignLink[];
}

// ═══════════════════════════════════════════════════════════
// Automations
// ═══════════════════════════════════════════════════════════

export type TriggerType =
  | "new_customer"
  | "post_purchase"
  | "review_request"
  | "win_back"
  | "abandoned_cart"
  | "wholesale_approved"
  | "birthday"
  | "re_engagement"
  | "custom"
  | "form_submitted"
  | "business_type_changed"
  | "order_placed"
  | "order_status_changed"
  | "contact_created"
  | "business_created"
  | "no_activity"
  | "date_based"
  | "discount_code_redeemed"
  | "email_engagement"
  | "custom_webhook";

// ═══════════════════════════════════════════════════════════
// Automation Trigger Filters
// ═══════════════════════════════════════════════════════════

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_set"
  | "is_not_set"
  | "in"
  | "not_in";

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/** Conditions within a group are joined with OR */
export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
}

/** Groups are joined with AND */
export interface TriggerFilters {
  groups: FilterGroup[];
}

export interface TriggerConfig {
  /** Event-specific config (form_id, order_status, etc.) */
  [key: string]: unknown;
}

export interface TriggerDefinition {
  type: TriggerType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind text color
  bg: string;    // tailwind bg color
  category: "event" | "time" | "engagement" | "custom";
  configFields?: TriggerConfigField[];
  filterFields?: TriggerFilterField[];
}

export interface TriggerConfigField {
  key: string;
  label: string;
  type: "select" | "text" | "number" | "multiselect";
  placeholder?: string;
  /** For select/multiselect: either static options or a dynamic key to fetch from API */
  options?: { value: string; label: string }[];
  dynamicOptionsKey?: string;
}

export interface TriggerFilterField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "date";
  operators: FilterOperator[];
  /** For select fields */
  options?: { value: string; label: string }[];
  dynamicOptionsKey?: string;
}

export type AutomationStatus = "draft" | "active" | "paused";
export type StepType = "email" | "delay" | "condition";
export type EnrollmentStatus = "active" | "completed" | "cancelled" | "failed";

export interface Automation {
  id: string;
  roaster_id: string | null;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  trigger_filters: TriggerFilters | null;
  status: AutomationStatus;
  is_template: boolean;
  enrolled_count: number;
  completed_count: number;
  last_trigger_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: StepType;
  config: Record<string, unknown>;
  created_at: string;
}

export interface AutomationEnrollment {
  id: string;
  automation_id: string;
  contact_id: string;
  current_step: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  next_step_at: string;
}

export interface AutomationStepLog {
  id: string;
  enrollment_id: string;
  step_id: string;
  status: "sent" | "opened" | "clicked" | "bounced" | "skipped";
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface AutomationWithSteps extends Automation {
  steps: AutomationStep[];
}

// ═══════════════════════════════════════════════════════════
// Discount Codes
// ═══════════════════════════════════════════════════════════

export type DiscountCodeStatus = "active" | "paused" | "expired" | "archived";
export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
export type DiscountAppliesTo = "all_products" | "specific_products" | "specific_categories";
export type DiscountSource = "manual" | "campaign" | "automation";

export interface DiscountCode {
  id: string;
  roaster_id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  currency: string;
  minimum_order_value: number | null;
  maximum_discount: number | null;
  applies_to: DiscountAppliesTo;
  product_ids: string[];
  usage_limit: number | null;
  usage_per_customer: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  status: DiscountCodeStatus;
  auto_apply: boolean;
  first_order_only: boolean;
  source: DiscountSource;
  campaign_id: string | null;
  automation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountRedemption {
  id: string;
  discount_code_id: string;
  order_id: string | null;
  contact_id: string | null;
  customer_email: string;
  order_value: number;
  discount_amount: number;
  redeemed_at: string;
}

export interface DiscountCodesListResponse {
  codes: DiscountCode[];
  total: number;
  page: number;
  limit: number;
  counts: {
    all: number;
    active: number;
    paused: number;
    expired: number;
    archived: number;
  };
}
