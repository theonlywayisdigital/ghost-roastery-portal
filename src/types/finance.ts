// ─── Status / Enum Types ───

export type PayoutStatus = "unpaid" | "batched" | "paid";
export type BatchStatus = "draft" | "reviewing" | "approved" | "processing" | "completed" | "partially_completed";
export type PayoutItemStatus = "pending" | "approved" | "paid" | "failed";
export type PayoutPaymentMethod = "stripe_transfer" | "bank_transfer";
export type BatchPaymentMethod = "stripe_transfer" | "bank_transfer" | "mixed";

export type InvoiceOwnerType = "ghost_roastery" | "roaster";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "partially_paid" | "overdue" | "void" | "cancelled";
export type InvoicePaymentStatus = "unpaid" | "pending" | "paid" | "partially_paid" | "overdue" | "cancelled" | "refunded";
export type InvoicePaymentMethod = "stripe" | "bank_transfer" | "cash" | "other";
export type LedgerOrderType = "ghost_roastery" | "storefront" | "wholesale" | "retail_stripe" | "wholesale_stripe" | "wholesale_invoice_online" | "wholesale_invoice_offline";
export type LedgerStatus = "pending" | "collected" | "failed" | "waived";

// ─── Platform Settings ───

export interface PlatformSettings {
  id: string;
  invoice_prefix: string;
  invoice_next_number: number;
  default_payment_terms: string;
  default_currency: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  bank_iban: string | null;
  payment_instructions: string | null;
  late_payment_terms: string | null;
  invoice_notes_default: string | null;
  auto_send_invoices: boolean;
  auto_reminder: boolean;
  reminder_days_before_due: number;
  created_at: string;
  updated_at: string;
}

// ─── Partner Payouts ───

export interface PayoutBatch {
  id: string;
  batch_number: string;
  status: BatchStatus;
  period_start: string | null;
  period_end: string | null;
  total_amount: number;
  total_orders: number;
  partner_count: number;
  payment_method: BatchPaymentMethod;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutItem {
  id: string;
  batch_id: string;
  roaster_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: PayoutItemStatus;
  payment_method: PayoutPaymentMethod;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  roaster_name?: string;
  order_number?: string;
}

export interface PayoutBatchDetail extends PayoutBatch {
  items: PayoutItem[];
  created_by_name?: string;
  approved_by_name?: string;
}

export interface PartnerOutstanding {
  roaster_id: string;
  roaster_name: string;
  order_count: number;
  total_amount: number;
  has_stripe_account: boolean;
}

// ─── Ledger ───

export interface LedgerEntry {
  id: string;
  roaster_id: string | null;
  order_type: LedgerOrderType;
  reference_id: string | null;
  gross_amount: number;
  fee_percent: number | null;
  fee_amount: number;
  net_to_roaster: number | null;
  currency: string;
  stripe_payment_id: string | null;
  status: LedgerStatus;
  collection_month: string | null;
  stripe_debit_id: string | null;
  created_at: string;
  // Joined
  roaster_name?: string;
}

// ─── Invoice Line Items & Payments ───

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: InvoicePaymentMethod;
  reference: string | null;
  stripe_payment_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  paid_at: string;
  created_at: string;
  // Joined
  recorded_by_name?: string;
}

// ─── Invoice (Full) ───

export interface InvoiceFull {
  id: string;
  invoice_number: string;
  roaster_id: string | null;
  buyer_id: string | null;
  owner_type: InvoiceOwnerType;
  customer_id: string | null;
  business_id: string | null;
  wholesale_access_id: string | null;
  order_ids: string[] | null;
  line_items: unknown; // Legacy JSONB line_items
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number | null;
  currency: string;
  platform_fee_percent: number;
  platform_fee_amount: number;
  payment_method: string;
  payment_status: InvoicePaymentStatus;
  payment_due_date: string | null;
  paid_at: string | null;
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_payment_intent_id: string | null;
  offline_payment_method: string | null;
  offline_payment_reference: string | null;
  notes: string | null;
  internal_notes: string | null;
  status: InvoiceStatus;
  issued_date: string | null;
  invoice_access_token: string | null;
  reminder_sent_at: string | null;
  sent_at: string | null;
  due_days: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  roaster_name?: string;
  customer_name?: string;
  customer_email?: string;
  business_name?: string;
  structured_line_items?: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

// ─── List / Summary Response Types ───

export interface PayoutBatchListResponse {
  data: PayoutBatch[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvoiceListResponse {
  data: InvoiceFull[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LedgerListResponse {
  data: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinanceOverview {
  totalRevenue: number;
  ghostRoasteryMargin: number;
  platformFees: number;
  outstandingPayouts: number;
  outstandingInvoices: number;
  totalRefunded: number;
  recentLedgerEntries: LedgerEntry[];
  monthlyRevenue: { month: string; revenue: number; fees: number }[];
}

// ─── Refunds ───

export type RefundType = "full" | "partial" | "store_credit";
export type RefundStatus = "pending" | "processing" | "completed" | "failed";
export type RefundReasonCategory = "customer_request" | "order_error" | "quality_issue" | "delivery_issue" | "duplicate_order" | "other";

export interface Refund {
  id: string;
  order_type: string;
  order_id: string;
  refund_type: RefundType;
  amount: number;
  currency: string;
  reason: string;
  reason_category: RefundReasonCategory | null;
  status: RefundStatus;
  stripe_refund_id: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  // Joined
  order_number?: string;
  customer_name?: string;
  customer_email?: string;
  created_by_name?: string;
}

export interface RefundListResponse {
  data: Refund[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RefundSummary {
  totalRefundedThisMonth: number;
  totalRefundedAllTime: number;
  refundCountThisMonth: number;
  averageRefundAmount: number;
}
