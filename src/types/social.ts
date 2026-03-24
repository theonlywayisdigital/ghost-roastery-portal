// ═══════════════════════════════════════════════════════════
// Social Media Types
// ═══════════════════════════════════════════════════════════

export type SocialPlatform = "facebook" | "instagram";
export type ConnectionStatus = "connected" | "disconnected" | "expired";
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "partially_failed";

// ═══════════════════════════════════════════════════════════
// Social Connections
// ═══════════════════════════════════════════════════════════

export interface SocialConnection {
  id: string;
  roaster_id: string;
  platform: SocialPlatform;
  platform_user_id: string | null;
  platform_page_id: string | null;
  page_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: ConnectionStatus;
  connected_at: string;
  last_used_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Social Posts
// ═══════════════════════════════════════════════════════════

export interface FacebookPlatformConfig {
  enabled: boolean;
  page_id?: string;
}

export interface InstagramPlatformConfig {
  enabled: boolean;
}

export interface PlatformConfigs {
  facebook?: FacebookPlatformConfig;
  instagram?: InstagramPlatformConfig;
}

export interface SocialPost {
  id: string;
  roaster_id: string;
  content: string;
  media_urls: string[];
  platforms: PlatformConfigs;
  scheduled_for: string | null;
  published_at: string | null;
  status: PostStatus;
  failure_reason: Record<string, string> | null;
  platform_post_ids: Record<string, string>;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Social Post Analytics
// ═══════════════════════════════════════════════════════════

export interface SocialPostAnalytics {
  id: string;
  post_id: string;
  platform: string;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  synced_at: string;
}

// ═══════════════════════════════════════════════════════════
// Platform Character Limits
// ═══════════════════════════════════════════════════════════

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  facebook: 63206,
  instagram: 2200,
};

// ═══════════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════════

export interface SocialPostsListResponse {
  posts: SocialPost[];
  total: number;
  page: number;
  limit: number;
  counts: {
    all: number;
    draft: number;
    scheduled: number;
    published: number;
    failed: number;
  };
}

export interface CalendarPost {
  id: string;
  content: string;
  platforms: PlatformConfigs;
  scheduled_for: string | null;
  published_at: string | null;
  status: PostStatus;
  tags: string[];
}

export interface CalendarPostsResponse {
  posts: CalendarPost[];
  month: string;
}

export interface PublishResult {
  platform: SocialPlatform;
  success: boolean;
  platform_post_id?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// Social Templates
// ═══════════════════════════════════════════════════════════

export interface SocialTemplate {
  id: string;
  roaster_id: string;
  name: string;
  description: string | null;
  caption_structure: string;
  hashtag_groups: string[];
  default_platforms: SocialPlatform[];
  tags: string[];
  created_at: string;
  updated_at: string;
}
