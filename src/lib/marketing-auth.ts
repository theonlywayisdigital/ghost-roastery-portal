import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentRoaster } from "@/lib/auth";

/**
 * Marketing owner context — identifies who "owns" the marketing data.
 *
 * - Roasters: owner_type='roaster', owner_id=roaster.id
 * - Admin (Roastery Platform): owner_type='ghost_roastery', owner_id=null
 */
export interface MarketingOwner {
  owner_type: "roaster" | "ghost_roastery";
  owner_id: string | null;
  /** Display name for "from" defaults (e.g. roaster business name or "Roastery Platform") */
  display_name: string;
  /** Default reply-to email */
  email: string;
}

/**
 * Resolve the marketing owner context for the current request.
 *
 * Detection logic:
 * 1. If the request URL contains /api/admin/, treat as admin context
 * 2. If adminContext option is explicitly true, treat as admin context
 * 3. Otherwise, treat as roaster context (getCurrentRoaster)
 *
 * For admin context, the user must have the "admin" role — returns null if not.
 * For roaster context, the user must be a roaster — returns null if not.
 */
export async function getMarketingOwner(
  request?: NextRequest,
  options?: { adminContext?: boolean }
): Promise<MarketingOwner | null> {
  const isAdminRoute =
    options?.adminContext === true ||
    (request && new URL(request.url).pathname.startsWith("/api/admin/"));

  if (isAdminRoute) {
    return getAdminMarketingOwner();
  }

  return getRoasterMarketingOwner();
}

/**
 * Returns marketing owner for admin (Roastery Platform) context.
 * Verifies the user has the "admin" role.
 */
async function getAdminMarketingOwner(): Promise<MarketingOwner | null> {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin") && !user?.roles.includes("super_admin")) return null;

  return {
    owner_type: "ghost_roastery",
    owner_id: null,
    display_name: "Roastery Platform",
    email: "hello@roasteryplatform.com",
  };
}

/**
 * Returns marketing owner for roaster context.
 * Uses getCurrentRoaster() — same behavior as existing marketing routes.
 */
async function getRoasterMarketingOwner(): Promise<MarketingOwner | null> {
  const roaster = await getCurrentRoaster();
  if (!roaster) return null;

  return {
    owner_type: "roaster",
    owner_id: roaster.id,
    display_name: roaster.business_name,
    email: roaster.email,
  };
}

/**
 * Apply the owner filter to a Supabase query.
 *
 * - Roaster: `.eq("roaster_id", owner_id)`
 * - Admin (ghost_roastery): `.is("roaster_id", null)`
 *
 * Pass `column` to override the default "roaster_id" column name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyOwnerFilter<T extends { eq: any; is: any }>(
  query: T,
  owner: MarketingOwner,
  column = "roaster_id"
): T {
  if (owner.owner_type === "ghost_roastery") {
    return query.is(column, null);
  }
  return query.eq(column, owner.owner_id);
}
