import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find valid token
    const { data: resetToken } = await supabase
      .from("password_reset_tokens")
      .select("id, roaster_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid reset link" },
        { status: 400 }
      );
    }

    if (resetToken.used_at) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This reset link has expired" },
        { status: 400 }
      );
    }

    // Find the roaster to get their user_id
    const { data: roaster } = await supabase
      .from("roasters")
      .select("id, user_id")
      .eq("id", resetToken.roaster_id)
      .single();

    if (!roaster) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth
    if (roaster.user_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        roaster.user_id,
        { password }
      );

      if (authError) {
        console.error("Auth password update error:", authError);
        return NextResponse.json(
          { error: "Failed to update password" },
          { status: 500 }
        );
      }
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
