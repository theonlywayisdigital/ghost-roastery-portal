import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const cookieStore = await cookies();
  const roasterId = cookieStore.get("impersonating_roaster_id")?.value;

  // Clear the cookie immediately regardless
  cookieStore.set("impersonating_roaster_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Log exit — getCurrentUser will return the real admin since we just cleared the cookie
  const user = await getCurrentUser();
  if (user?.roles.includes("admin") && roasterId) {
    const supabase = createServerClient();
    await supabase.from("user_activity_log").insert({
      user_id: user.id,
      activity_type: "admin_impersonation_exit",
      description: `Exited impersonation of roaster ${roasterId}`,
      metadata: { roaster_id: roasterId },
    });
  }

  const redirectUrl = roasterId
    ? `/admin/roasters/${roasterId}`
    : "/admin/dashboard";

  return NextResponse.json({ redirectUrl });
}
