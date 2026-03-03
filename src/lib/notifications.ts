import { createServerClient } from "@/lib/supabase";

export type NotificationType =
  | "form_submission"
  | "wholesale_application"
  | "new_order"
  | "order_status_updated"
  | "team_invite"
  | "platform_announcement"
  | "new_contact"
  | "automation_triggered"
  | "campaign_sent"
  | "review_received"
  | "social_post_published"
  | "social_post_failed"
  | "social_connection_expired";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user.
 * Call this from any API route, webhook, or background process.
 * Fails silently — never throws. Returns the notification or null.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string } | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link || null,
        metadata: params.metadata || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create notification:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

/**
 * Create notifications for multiple users at once.
 * Useful for platform announcements.
 */
export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
): Promise<number> {
  if (notifications.length === 0) return 0;

  try {
    const supabase = createServerClient();
    const rows = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link || null,
      metadata: n.metadata || null,
    }));

    const { error } = await supabase.from("notifications").insert(rows);

    if (error) {
      console.error("Failed to create bulk notifications:", error);
      return 0;
    }

    return notifications.length;
  } catch (err) {
    console.error("Failed to create bulk notifications:", err);
    return 0;
  }
}
