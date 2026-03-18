import { NextResponse } from "next/server";
import { createServerClient, createAuthServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Authenticate via cookie
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Verify current password by attempting sign-in
    const supabase = createServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Update password via admin API
    const { error: updateError } =
      await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Buyer password change error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
