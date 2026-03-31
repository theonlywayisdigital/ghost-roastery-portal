import { createAuthServerClient, createServerClient } from "@/lib/supabase";

export interface PortalProfile {
  people_id: string;
  role: string;
  associated_roaster_id: string | null;
  auth_status: string;
  last_login_at: string | null;
}

export interface PortalUser {
  id: string; // auth.users.id
  email: string;
  fullName: string | null;
  roles: string[]; // e.g. ["roaster", "ghost_roastery_customer"]
  profile: PortalProfile | null;
  roaster: {
    id: string;
    business_name: string;
    contact_name: string;
    contact_first_name: string | null;
    contact_last_name: string | null;
    email: string;
    phone: string | null;
    website: string | null;
    country: string;
    roaster_slug: string;
    is_active: boolean;
    is_ghost_roaster: boolean;
    is_verified: boolean;
    wholesale_enabled: boolean;
    ghost_roaster_application_status: string | null;
    storefront_name: string | null;
    storefront_tagline: string | null;
    storefront_accent_colour: string | null;
    storefront_logo_url: string | null;
    stripe_account_id: string | null;
    stripe_onboarding_complete: boolean;
    website_subscription_active: boolean;
    [key: string]: unknown;
  } | null;
}

/**
 * Get the currently authenticated user from the Supabase session.
 * Fetches roles from user_roles and roaster data from roasters.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<PortalUser | null> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceClient = createServerClient();

  // Fetch roles
  const { data: roleRows } = await serviceClient
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  const roles = (roleRows || []).map((r: { role_id: string }) => r.role_id);

  // Fetch roaster data if user has a roaster role
  let roaster: PortalUser["roaster"] = null;
  if (roles.includes("roaster")) {
    const { data } = await serviceClient
      .from("roasters")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    roaster = data;
  }

  // Fetch profile
  let profile: PortalProfile | null = null;
  const { data: profileData } = await serviceClient
    .from("profiles")
    .select("people_id, role, associated_roaster_id, auth_status, last_login_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileData) {
    profile = profileData as PortalProfile;
  }

  return {
    id: user.id,
    email: user.email || "",
    fullName: user.user_metadata?.full_name || null,
    roles,
    profile,
    roaster,
  };
}

/**
 * Backward-compatible wrapper: returns the roasters row
 * just like the old bcrypt-based getCurrentRoaster().
 *
 * All existing pages that call getCurrentRoaster() continue to work
 * without changes — they get the same return type.
 */
export async function getCurrentRoaster() {
  const portalUser = await getCurrentUser();

  if (!portalUser) return null;

  // If user is a roaster, return their roaster record
  if (portalUser.roaster) {
    return portalUser.roaster;
  }

  // For non-roaster users (customers), return null
  // (existing roaster pages will redirect to /login as before)
  return null;
}
