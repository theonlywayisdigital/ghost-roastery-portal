import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const DEFAULT_PREFERENCES: Record<string, boolean> = {
  // Order notifications
  new_storefront_order: true,
  new_wholesale_order: true,
  new_ghost_roastery_order: true,
  order_status_updated: true,
  // Customer notifications
  new_wholesale_application: true,
  new_contact_enquiry: true,
  // Marketing & platform
  ghost_roastery_newsletter: true,
  product_tips_updates: true,
  platform_maintenance: true, // always on
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("preference_key, enabled")
    .eq("user_id", user.id);

  if (error) {
    console.error("Notification prefs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }

  // Merge with defaults
  const preferences: Record<string, boolean> = { ...DEFAULT_PREFERENCES };
  for (const pref of prefs || []) {
    preferences[pref.preference_key] = pref.enabled;
  }

  // Platform maintenance is always on
  preferences.platform_maintenance = true;

  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { preferences } = body as {
      preferences: Record<string, boolean>;
    };

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Upsert each preference
    const upserts = Object.entries(preferences)
      .filter(([key]) => key !== "platform_maintenance") // Can't change this one
      .map(([key, enabled]) => ({
        user_id: user.id,
        preference_key: key,
        enabled,
        updated_at: new Date().toISOString(),
      }));

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(upserts, {
          onConflict: "user_id,preference_key",
        });

      if (error) {
        console.error("Notification prefs update error:", error);
        return NextResponse.json(
          { error: "Failed to update preferences" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification prefs update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
