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

    // Update profile auth_status
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ auth_status: "active" })
      .eq("id", id);

    if (profileError) {
      console.error("Admin reactivate profile error:", profileError);
      return NextResponse.json(
        { error: "Failed to reactivate user" },
        { status: 500 }
      );
    }

    // Unban via auth (ban_duration: 'none' removes the ban)
    const { error: unbanError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: "none",
    });

    if (unbanError) {
      console.error("Admin reactivate unban error:", unbanError);
      // Revert profile status
      await supabase
        .from("profiles")
        .update({ auth_status: "suspended" })
        .eq("id", id);
      return NextResponse.json(
        { error: "Failed to unban user" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("user_activity_log").insert({
      user_id: id,
      performed_by: user.id,
      action: "user_reactivated",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin reactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
