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

    // Get the user's email from auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.getUserById(id);

    if (authError || !authData.user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate invite link (resends invite email)
    const { error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: authData.user.email,
    });

    if (linkError) {
      console.error("Admin resend-invite link error:", linkError);
      return NextResponse.json(
        { error: "Failed to resend invite" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("user_activity_log").insert({
      user_id: id,
      performed_by: user.id,
      action: "invite_resent",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin resend-invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
