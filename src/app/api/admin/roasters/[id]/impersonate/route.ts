import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Log to roaster_activity
    await supabase.from("roaster_activity").insert({
      roaster_id: id,
      author_id: user.id,
      activity_type: "admin_impersonation",
      description: `Admin impersonation by ${user.email}`,
      metadata: { admin_id: user.id, admin_email: user.email },
    });

    // Log to user_activity_log for the admin user
    await supabase.from("user_activity_log").insert({
      user_id: user.id,
      activity_type: "admin_impersonation",
      description: `Impersonated roaster ${id}`,
      metadata: { roaster_id: id },
    });

    return NextResponse.json({ redirectUrl: `/dashboard?impersonate=${id}` });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
