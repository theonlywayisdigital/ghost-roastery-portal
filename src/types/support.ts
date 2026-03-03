// ── Knowledge Base ──

export type ArticleType = "faq" | "tutorial" | "guide";
export type AudienceType = "customer" | "roaster" | "admin";

export interface KBCategory {
  id: string;
  name: string;
  slug: string;
  audience: AudienceType[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  article_count?: number;
}

export interface KBArticle {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  type: ArticleType;
  audience: AudienceType[];
  content: string;
  excerpt: string;
  video_url: string | null;
  media: { url: string; name: string; type: string }[];
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  view_count: number;
  helpful_yes: number;
  helpful_no: number;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: KBCategory;
}

// ── Tickets ──

export type TicketType =
  | "general"
  | "order_issue"
  | "billing"
  | "technical"
  | "dispute"
  | "payout"
  | "platform";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "waiting_on_roaster"
  | "resolved"
  | "closed";

export type TicketCreatorType = "customer" | "roaster" | "admin";
export type MessageSenderType = "customer" | "roaster" | "admin" | "system";

export type DisputeStatus =
  | "none"
  | "open"
  | "resolved_customer"
  | "resolved_roaster"
  | "resolved_split";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string;
  created_by_type: TicketCreatorType;
  assigned_to: string | null;
  roaster_id: string | null;
  order_id: string | null;
  chatbot_conversation: ChatMessage[] | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator_name?: string;
  creator_email?: string;
  assignee_name?: string;
  order_number?: string;
  roaster_name?: string;
  message_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: MessageSenderType;
  message: string;
  attachments: { url: string; name: string; type: string; size: number }[];
  is_internal: boolean;
  created_at: string;
  // Joined fields
  sender_name?: string;
  sender_email?: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  changed_by: string | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  // Joined
  changed_by_name?: string;
}

// ── Chatbot ──

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatbotConversation {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  escalated_to_ticket: boolean;
  ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── List Responses ──

export interface TicketsListResponse {
  data: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArticlesListResponse {
  data: KBArticle[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Stats ──

export interface TicketStats {
  open: number;
  unassigned: number;
  urgent: number;
  avgResolutionHours: number;
  todayNew: number;
}
